import * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: 'default' | 'emerald' | 'amber' | 'orange'
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : accent === 'orange'
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-muted-foreground'

  return (
    <Card className="gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn('h-4 w-4 shrink-0', accentClass)} />
      </div>
      <p className="text-xl font-semibold tabular-nums text-foreground md:text-2xl">
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}
