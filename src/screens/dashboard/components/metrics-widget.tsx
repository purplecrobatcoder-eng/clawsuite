import { RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { WidgetShell } from './widget-shell'
import type { DashboardIcon } from './dashboard-types'
import { cn } from '@/lib/utils'

type MetricsWidgetProps = {
  title: string
  value: string
  subtitle: string
  icon: DashboardIcon
  isError?: boolean
  onRetry?: () => void
  className?: string
}

export function MetricsWidget({
  title,
  value,
  subtitle,
  icon,
  isError = false,
  onRetry,
  className,
}: MetricsWidgetProps) {
  return (
    <WidgetShell
      size="small"
      title={title}
      icon={icon}
      className={cn('h-full', className)}
      action={
        isError && onRetry ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onRetry()
            }}
            className="inline-flex size-5 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100"
            aria-label={`Retry ${title}`}
            title={`Retry ${title}`}
          >
            <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={1.5} />
          </button>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col justify-center">
        <p
          className={cn(
            'truncate font-mono text-2xl font-semibold leading-none tabular-nums',
            isError ? 'text-primary-300' : 'text-ink',
          )}
        >
          {isError ? '—' : value}
        </p>
        <p
          className={cn(
            'mt-1 text-[11px] leading-tight',
            isError ? 'text-red-600' : 'text-primary-500',
          )}
        >
          {isError ? value : subtitle}
        </p>
      </div>
    </WidgetShell>
  )
}
