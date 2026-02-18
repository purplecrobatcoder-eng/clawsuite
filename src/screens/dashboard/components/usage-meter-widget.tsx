import { ChartLineData02Icon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { WidgetShell } from './widget-shell'
import { cn } from '@/lib/utils'

type ProviderUsage = {
  provider: string
  total: number
  inputOutput: number
  cached: number
  cost: number
  directCost: number
  percentUsed?: number
}

export type UsageMeterData = {
  usagePercent?: number
  totalCost: number
  totalDirectCost: number
  totalUsage: number
  totalInputOutput: number
  totalCached: number
  providers: Array<ProviderUsage>
}

type UsageApiResponse = {
  ok?: boolean
  usage?: unknown
  unavailable?: boolean
  error?: unknown
}

export type UsageQueryResult =
  | { kind: 'ok'; data: UsageMeterData }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function parseProviderUsage(provider: string, value: unknown): ProviderUsage {
  const source = toRecord(value)
  const input = readNumber(source.input)
  const output = readNumber(source.output)
  const cacheRead = readNumber(source.cacheRead)
  const cacheWrite = readNumber(source.cacheWrite)
  const inputCost = readNumber(source.inputCost)
  const outputCost = readNumber(source.outputCost)

  return {
    provider,
    total: readNumber(source.total),
    inputOutput: input + output,
    cached: cacheRead + cacheWrite,
    cost: readNumber(source.cost),
    directCost: inputCost + outputCost,
    percentUsed: readNumber(source.percentUsed) || undefined,
  }
}

function parseUsagePayload(payload: unknown): UsageMeterData {
  const root = toRecord(payload)
  const totalSource = toRecord(root.total)
  const byProviderSource = toRecord(root.byProvider)

  const providers = Object.entries(byProviderSource)
    .map(function mapProvider([provider, value]) {
      return parseProviderUsage(provider, value)
    })
    .sort(function sortProvidersByUsage(left, right) {
      return right.total - left.total
    })

  const totalUsageRaw = readNumber(totalSource.total)
  const totalUsage =
    totalUsageRaw > 0
      ? totalUsageRaw
      : providers.reduce(function sumUsage(total, provider) {
          return total + provider.total
        }, 0)

  const totalInputOutput = providers.reduce(function sumIO(total, provider) {
    return total + provider.inputOutput
  }, 0)

  const totalCached = providers.reduce(function sumCached(total, provider) {
    return total + provider.cached
  }, 0)

  const totalCostRaw = readNumber(totalSource.cost)
  const totalCost =
    totalCostRaw > 0
      ? totalCostRaw
      : providers.reduce(function sumCost(total, provider) {
          return total + provider.cost
        }, 0)

  const totalDirectCost = providers.reduce(function sumDirectCost(
    total,
    provider,
  ) {
    return total + provider.directCost
  }, 0)

  const totalPercent = readNumber(totalSource.percentUsed)
  const maxProviderPercent = providers.reduce(function readMaxPercent(
    currentMax,
    provider,
  ) {
    if (provider.percentUsed === undefined) return currentMax
    return provider.percentUsed > currentMax ? provider.percentUsed : currentMax
  }, 0)
  const usagePercent =
    totalPercent > 0
      ? totalPercent
      : maxProviderPercent > 0
        ? maxProviderPercent
        : undefined

  return {
    usagePercent,
    totalCost,
    totalDirectCost,
    totalUsage,
    totalInputOutput,
    totalCached,
    providers,
  }
}

function parseErrorMessage(payload: UsageApiResponse): string {
  const message = readString(payload.error)
  return message.length > 0 ? message : 'Usage unavailable'
}

export async function fetchUsage(): Promise<UsageQueryResult> {
  try {
    const response = await fetch('/api/usage')
    const payload = (await response
      .json()
      .catch(() => ({}))) as UsageApiResponse

    if (response.status === 501 || payload.unavailable) {
      return {
        kind: 'unavailable',
        message: 'Unavailable on this Gateway version',
      }
    }

    if (!response.ok || payload.ok === false) {
      return {
        kind: 'error',
        message: parseErrorMessage(payload),
      }
    }

    return {
      kind: 'ok',
      data: parseUsagePayload(payload.usage),
    }
  } catch (error) {
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Usage unavailable',
    }
  }
}

function formatTokens(tokens: number): string {
  return new Intl.NumberFormat().format(Math.max(0, Math.round(tokens)))
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

type UsageMeterWidgetProps = {
  draggable?: boolean
  onRemove?: () => void
  editMode?: boolean
}

export function UsageMeterWidget({
  draggable: _draggable = false,
  onRemove,
  editMode,
}: UsageMeterWidgetProps) {
  const [view, setView] = useState<'tokens' | 'cost'>('tokens')
  const usageQuery = useQuery({
    queryKey: ['dashboard', 'usage'],
    queryFn: fetchUsage,
    retry: false,
    refetchInterval: 30_000,
  })

  const queryResult = usageQuery.data
  const usageData = queryResult?.kind === 'ok' ? queryResult.data : null

  const usagePercent = useMemo(
    function computeUsagePercent() {
      const value = usageData?.usagePercent ?? 0
      return Math.max(0, Math.min(100, Math.round(value)))
    },
    [usageData?.usagePercent],
  )

  const tokenLimit = useMemo(
    function computeTokenLimit() {
      if (!usageData) return 0
      if (usagePercent <= 0) return usageData.totalUsage
      return Math.max(usageData.totalUsage, Math.round(usageData.totalUsage / (usagePercent / 100)))
    },
    [usageData, usagePercent],
  )

  const subtitle = usageData
    ? `${formatTokens(usageData.totalUsage)} / ${formatTokens(tokenLimit)} tokens`
    : 'Usage unavailable'

  return (
    <WidgetShell
      size="medium"
      title="Usage Meter"
      icon={ChartLineData02Icon}
      action={
        <div className="inline-flex items-center gap-0.5 rounded-full border border-primary-200 bg-primary-100/70 p-0.5 text-[10px]">
          {(['tokens', 'cost'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setView(tab)
              }}
              className={cn(
                'rounded-full px-2 py-0.5 font-medium transition-colors',
                view === tab
                  ? 'bg-accent-100 text-accent-700 shadow-sm'
                  : 'text-primary-500 hover:text-primary-700',
              )}
            >
              {tab === 'tokens' ? 'Tokens' : 'Cost'}
            </button>
          ))}
        </div>
      }
      onRemove={onRemove}
      editMode={editMode}
      className="h-full"
    >
      {queryResult?.kind === 'unavailable' ? (
        <div className="rounded-lg border border-primary-200 bg-primary-100/45 px-3 py-3 text-sm text-primary-600">
          {queryResult.message}
        </div>
      ) : queryResult?.kind === 'error' ? (
        <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-3 text-sm text-red-700">
          {queryResult.message}
        </div>
      ) : !usageData ? (
        <div className="rounded-lg border border-primary-200 bg-primary-100/45 px-3 py-3 text-sm text-primary-600">
          Loading usage data…
        </div>
      ) : (
        <div className="space-y-2.5">
          <div>
            <p className="font-mono text-2xl font-bold leading-none text-ink tabular-nums">
              {usagePercent}%
            </p>
            <p className="mt-1 text-xs text-primary-500">Usage</p>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200/80 dark:bg-gray-700/70">
            <div
              className="h-1.5 rounded-full bg-orange-400 transition-[width] duration-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <p className="text-xs text-primary-500">{subtitle}</p>

          {view === 'cost' ? (
            <p className="text-xs text-primary-600">
              {formatUsd(usageData.totalDirectCost)} direct • {formatUsd(usageData.totalCost)} total
            </p>
          ) : (
            <p className="text-xs text-primary-600">
              In/Out {formatTokens(usageData.totalInputOutput)} • Cached{' '}
              {formatTokens(usageData.totalCached)}
            </p>
          )}
        </div>
      )}
    </WidgetShell>
  )
}
