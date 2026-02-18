import { Activity01Icon } from '@hugeicons/core-free-icons'
import { WidgetShell } from './widget-shell'
import { cn } from '@/lib/utils'

type NowCardProps = {
  gatewayConnected: boolean
  activeAgents: number
  activeTasks: number
  className?: string
  editMode?: boolean
  onRemove?: () => void
}

export function NowCard({
  gatewayConnected,
  activeAgents,
  activeTasks,
  className,
  editMode,
  onRemove,
}: NowCardProps) {
  const connectionLabel = gatewayConnected ? 'Connected' : 'Disconnected'
  const connectionTextClass = gatewayConnected ? 'text-emerald-700' : 'text-red-700'
  const connectionDotClass = gatewayConnected ? 'bg-emerald-500' : 'bg-red-500'

  return (
    <WidgetShell
      size="medium"
      title="Now"
      icon={Activity01Icon}
      onRemove={onRemove}
      editMode={editMode}
      className={cn(
        'h-full md:hidden',
        className,
      )}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary-500">
            Agents Active
          </p>
          <p className="font-mono text-4xl font-semibold leading-none text-ink tabular-nums">
            {activeAgents}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-primary-200/80 bg-primary-100/70 px-2 py-0.5 text-xs font-medium',
            connectionTextClass,
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              connectionDotClass,
              gatewayConnected && 'animate-pulse',
            )}
          />
          {connectionLabel}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-primary-200/75 bg-primary-100/50 px-3 py-2">
          <p className="text-[11px] text-primary-500">System Health</p>
          <p className={cn('text-sm font-semibold', connectionTextClass)}>
            {connectionLabel}
          </p>
        </div>
        <div className="rounded-lg border border-primary-200/75 bg-primary-100/50 px-3 py-2">
          <p className="text-[11px] text-primary-500">Tasks In Progress</p>
          <p className="font-mono text-sm font-semibold text-ink tabular-nums">
            {activeTasks}
          </p>
        </div>
      </div>
    </WidgetShell>
  )
}
