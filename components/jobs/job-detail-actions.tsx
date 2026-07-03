'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, DollarSign, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { dollarsToCents, centsToDollars } from '@/lib/money'
import {
  setJobStatus,
  setCashStatus,
  setJobTip,
  markJobPaid,
  deleteJob,
} from '@/lib/actions/jobs'
import type { JobStatus, CashStatus, PayoutStatus } from '@prisma/client'

type JobLite = {
  id: string
  status: JobStatus
  cashStatus: CashStatus
  payoutStatus: PayoutStatus
  tipCents: number
}

export function JobDetailActions({ job, isAdmin }: { job: JobLite; isAdmin: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [completeOpen, setCompleteOpen] = React.useState(false)
  const [completionNote, setCompletionNote] = React.useState('')
  const [tipOpen, setTipOpen] = React.useState(false)
  const [tipDollars, setTipDollars] = React.useState(String(centsToDollars(job.tipCents)))

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) {
        toast.error(res.error ?? 'Something went wrong')
        return
      }
      toast.success(success)
      router.refresh()
    })
  }

  function markCompleted() {
    run(
      () => setJobStatus({ jobId: job.id, status: 'COMPLETED', completionNote: completionNote.trim() || undefined }),
      'Job marked completed'
    )
    setCompleteOpen(false)
    setCompletionNote('')
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-2 py-4">
        {/* Complete / reopen — available to the assigned employee and admins */}
        {job.status === 'PENDING' ? (
          <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
            <DialogTrigger render={<Button disabled={pending} />}>
              <CheckCircle2 className="h-4 w-4" />
              Mark completed
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark job completed</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="note">Completion note (optional)</Label>
                <Textarea
                  id="note"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="e.g. Customer tipped cash, took longer than expected…"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={markCompleted} disabled={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark completed
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setJobStatus({ jobId: job.id, status: 'PENDING' }), 'Job reopened')}
          >
            <RotateCcw className="h-4 w-4" />
            Reopen
          </Button>
        )}

        {isAdmin && (
          <>
            {/* Cash collection toggle */}
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    setCashStatus({
                      jobId: job.id,
                      cashStatus: job.cashStatus === 'COLLECTED' ? 'OUTSTANDING' : 'COLLECTED',
                    }),
                  'Cash status updated'
                )
              }
            >
              <DollarSign className="h-4 w-4" />
              {job.cashStatus === 'COLLECTED' ? 'Mark cash outstanding' : 'Mark cash collected'}
            </Button>

            {/* Edit tip */}
            <Dialog open={tipOpen} onOpenChange={setTipOpen}>
              <DialogTrigger render={<Button variant="outline" disabled={pending} />}>
                Edit tip
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit tip</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="tip">Tip amount ($)</Label>
                  <Input
                    id="tip"
                    inputMode="decimal"
                    value={tipDollars}
                    onChange={(e) => setTipDollars(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">Tips go 100% to the employee.</p>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button
                    disabled={pending}
                    onClick={() => {
                      run(() => setJobTip({ jobId: job.id, tipCents: dollarsToCents(tipDollars) }), 'Tip updated')
                      setTipOpen(false)
                    }}
                  >
                    Save tip
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Mark payout paid */}
            {job.status === 'COMPLETED' && job.payoutStatus === 'UNPAID' && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => run(() => markJobPaid({ jobId: job.id }), 'Payout marked paid')}
              >
                <DollarSign className="h-4 w-4" />
                Mark payout paid
              </Button>
            )}

            {/* Edit */}
            <Button variant="outline" render={<Link href={`/jobs/${job.id}/edit`} />}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" disabled={pending} />}>
                <Trash2 className="h-4 w-4" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the job. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      startTransition(async () => {
                        const res = await deleteJob({ id: job.id })
                        if (!res.ok) {
                          toast.error(res.error ?? 'Could not delete job')
                          return
                        }
                        toast.success('Job deleted')
                        router.push('/jobs')
                        router.refresh()
                      })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  )
}
