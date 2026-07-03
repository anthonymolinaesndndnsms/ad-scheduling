import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/money'
import {
  PAYOUT_STATUS_CLASSES,
  PAYOUT_STATUS_LABELS,
} from '@/lib/labels'
import type { PayoutJob } from '@/app/(app)/payouts/data'

/**
 * Read-only earnings list for the employee self-view. Shows their completed
 * jobs with price, what they earned (employeeTotalCents), tips, and payout
 * status. Never surfaces the owner's net share.
 */
export function EmployeeEarningsList({ jobs }: { jobs: PayoutJob[] }) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No completed jobs yet. Finished jobs and what you earned will show up
        here.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {jobs.map((job) => (
        <li
          key={job.id}
          className="flex items-start justify-between gap-3 p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{job.title}</p>
              <Badge
                variant="outline"
                className={PAYOUT_STATUS_CLASSES[job.payoutStatus]}
              >
                {PAYOUT_STATUS_LABELS[job.payoutStatus]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(job.startTime), 'MMM d, yyyy')} ·{' '}
              {job.serviceName}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
              <span>Price {formatMoney(job.priceCents)}</span>
              {job.tipCents > 0 && <span>Tip {formatMoney(job.tipCents)}</span>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">You earned</p>
            <p className="font-semibold tabular-nums">
              {formatMoney(job.employeeTotalCents)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
