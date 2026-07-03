import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Compact metric tile used across both dashboards.
 * Presentational only — pass a pre-formatted `value` (money already run
 * through formatMoney, counts as plain numbers/strings).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  emphasis = false,
  className,
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  emphasis?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 md:p-5',
        emphasis && 'ring-1 ring-primary/20',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <div>
        <p
          className={cn(
            'text-2xl font-bold tabular-nums leading-none',
            emphasis ? 'text-primary' : 'text-foreground',
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}
