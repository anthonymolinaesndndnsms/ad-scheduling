'use client'

import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ChevronDown, CircleCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney } from '@/lib/money'
import { CASH_STATUS_CLASSES, CASH_STATUS_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { markJobsPaid } from '@/lib/actions/payouts'
import type { EmployeeSection } from '@/app/(app)/payouts/data'
import { PayoutHistory } from './payout-history'

export function EmployeePayoutSection({ section }: { section: EmployeeSection }) {
  const { employeeId, employeeName, totals, unpaidJobs, history } = section

  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmScope, setConfirmScope] = useState<'selected' | 'all'>('selected')
  const [isPending, startTransition] = useTransition()

  const allIds = useMemo(() => unpaidJobs.map((j) => j.id), [unpaidJobs])
  const allSelected = selected.size > 0 && selected.size === allIds.length

  const selectedJobs = useMemo(
    () => unpaidJobs.filter((j) => selected.has(j.id)),
    [unpaidJobs, selected]
  )
  const selectedTotalCents = selectedJobs.reduce(
    (s, j) => s + j.employeeTotalCents,
    0
  )

  const scopeJobs = confirmScope === 'all' ? unpaidJobs : selectedJobs
  const scopeTotalCents = scopeJobs.reduce((s, j) => s + j.employeeTotalCents, 0)

  function toggleJob(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allIds) : new Set())
  }

  function openConfirm(scope: 'selected' | 'all') {
    setConfirmScope(scope)
    setConfirmOpen(true)
  }

  function submit() {
    const jobIds = scopeJobs.map((j) => j.id)
    if (jobIds.length === 0) return

    startTransition(async () => {
      const result = await markJobsPaid({
        employeeId,
        jobIds,
        note: note.trim() || undefined,
      })
      if (result.ok) {
        toast.success(
          `Paid ${employeeName} — ${jobIds.length} ${
            jobIds.length === 1 ? 'job' : 'jobs'
          } (${formatMoney(scopeTotalCents)})`
        )
        setSelected(new Set())
        setNote('')
        setConfirmOpen(false)
      } else {
        toast.error(result.error ?? 'Could not mark as paid')
      }
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      {/* Header row */}
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{employeeName}</h3>
          <p className="text-sm text-muted-foreground">
            {unpaidJobs.length}{' '}
            {unpaidJobs.length === 1 ? 'job awaiting' : 'jobs awaiting'} payout
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Owed
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatMoney(totals.owedCents)}
            </p>
          </div>
          {unpaidJobs.length > 0 && (
            <Button
              size="lg"
              className="h-10"
              onClick={() => openConfirm('all')}
              disabled={isPending}
            >
              Pay all
            </Button>
          )}
        </div>
      </div>

      {/* Unpaid jobs */}
      {unpaidJobs.length > 0 && (
        <div className="border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <Checkbox
              checked={allSelected}
              indeterminate={selected.size > 0 && !allSelected}
              onCheckedChange={(checked) => toggleAll(checked === true)}
              aria-label="Select all jobs"
            />
            <span className="text-sm text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} selected`
                : 'Select jobs to pay'}
            </span>
          </div>

          <ul className="divide-y divide-border">
            {unpaidJobs.map((job) => {
              const isChecked = selected.has(job.id)
              return (
                <li
                  key={job.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 md:px-6 transition-colors',
                    isChecked && 'bg-primary/5'
                  )}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      toggleJob(job.id, checked === true)
                    }
                    aria-label={`Select ${job.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{job.title}</p>
                      <Badge
                        variant="outline"
                        className={CASH_STATUS_CLASSES[job.cashStatus]}
                      >
                        {CASH_STATUS_LABELS[job.cashStatus]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(job.startTime), 'MMM d, yyyy')} ·{' '}
                      {job.serviceName}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                      <span>Price {formatMoney(job.priceCents)}</span>
                      <span>
                        Share ({job.employeeSplitPercent}%){' '}
                        {formatMoney(job.employeeShareCents)}
                      </span>
                      {job.tipCents > 0 && (
                        <span>Tip {formatMoney(job.tipCents)}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold tabular-nums">
                      {formatMoney(job.employeeTotalCents)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Selected action bar */}
          <div className="flex flex-col gap-3 border-t border-border p-4 md:flex-row md:items-center md:justify-between md:px-6">
            <p className="text-sm text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} of ${unpaidJobs.length} selected · ${formatMoney(
                    selectedTotalCents
                  )}`
                : 'No jobs selected'}
            </p>
            <Button
              className="h-10"
              disabled={selected.size === 0 || isPending}
              onClick={() => openConfirm('selected')}
            >
              {selected.size > 0
                ? `Mark ${selected.size} selected paid (${formatMoney(
                    selectedTotalCents
                  )})`
                : 'Mark selected paid'}
            </Button>
          </div>
        </div>
      )}

      {/* Totals + history (expandable) */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50 md:px-6"
        >
          <span>Totals &amp; payout history</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </button>

        {expanded && (
          <div className="space-y-4 px-4 pb-5 md:px-6">
            {/* Range totals */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <TotalCell label="Owed" value={totals.owedCents} />
              <TotalCell label="Paid" value={totals.paidCents} />
              <TotalCell label="Gross" value={totals.grossCents} />
              <TotalCell label="Net (owner)" value={totals.netCents} />
              <TotalCell label="Tips" value={totals.tipsCents} />
            </dl>

            <div>
              <p className="mb-2 text-sm font-medium">Payout history</p>
              <PayoutHistory
                batches={history}
                emptyLabel="No payouts in this range yet."
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark payout as paid</DialogTitle>
            <DialogDescription>
              Record a payout of {formatMoney(scopeTotalCents)} to {employeeName}{' '}
              for {scopeJobs.length}{' '}
              {scopeJobs.length === 1 ? 'job' : 'jobs'}. This marks the jobs as
              paid and notifies them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`payout-note-${employeeId}`}>Note (optional)</Label>
            <Textarea
              id={`payout-note-${employeeId}`}
              placeholder="e.g. Venmo, cash, week of…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={isPending || scopeJobs.length === 0}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CircleCheck className="h-4 w-4" />
              )}
              Confirm {formatMoney(scopeTotalCents)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function TotalCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{formatMoney(value)}</dd>
    </div>
  )
}
