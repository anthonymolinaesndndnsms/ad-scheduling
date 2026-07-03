'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Receipt } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { PayoutBatch } from '@/app/(app)/payouts/data'

function BatchRow({ batch }: { batch: PayoutBatch }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 rounded-xl"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {format(new Date(batch.paidAt), 'MMM d, yyyy')}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {batch.jobCount} {batch.jobCount === 1 ? 'job' : 'jobs'}
            {batch.tipCents > 0
              ? ` · ${formatMoney(batch.tipCents)} tips`
              : ''}
            {batch.note ? ` · ${batch.note}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums">
            {formatMoney(batch.totalCents)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Share {formatMoney(batch.amountCents)}</span>
            <span>Tips {formatMoney(batch.tipCents)}</span>
          </div>
          <ul className="space-y-1.5">
            {batch.jobs.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">{j.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(j.startTime), 'MMM d, yyyy')} ·{' '}
                    {formatMoney(j.priceCents)}
                    {j.tipCents > 0 ? ` + ${formatMoney(j.tipCents)} tip` : ''}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums font-medium">
                  {formatMoney(j.employeeTotalCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function PayoutHistory({
  batches,
  emptyLabel = 'No payouts yet.',
}: {
  batches: PayoutBatch[]
  emptyLabel?: string
}) {
  if (batches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {batches.map((b) => (
        <BatchRow key={b.id} batch={b} />
      ))}
    </div>
  )
}
