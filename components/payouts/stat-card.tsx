import type { LucideIcon } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  cents,
  icon: Icon,
  hint,
  accent,
}: {
  label: string
  cents: number
  icon: LucideIcon
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            accent
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums md:text-3xl">
        {formatMoney(cents)}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
