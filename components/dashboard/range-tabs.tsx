import Link from 'next/link'
import { cn } from '@/lib/utils'

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'All' },
] as const

/**
 * Link-based range filter that drives the employee dashboard via ?range=.
 * Styled to match the Tabs look without needing client-side state.
 */
export function RangeTabs({ current }: { current: 'today' | 'week' | 'all' }) {
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
      {RANGES.map((r) => {
        const active = r.value === current
        return (
          <Link
            key={r.value}
            href={r.value === 'today' ? '/dashboard' : `/dashboard?range=${r.value}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground',
            )}
          >
            {r.label}
          </Link>
        )
      })}
    </div>
  )
}
