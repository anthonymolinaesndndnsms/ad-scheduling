import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { addMinutes, format } from 'date-fns'
import { ArrowLeft, MapPin, Phone, StickyNote } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import {
  formatMoney,
  employeeShareCents,
  adminShareCents,
  employeeTotalCents,
} from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ServiceBadge,
  JobStatusBadge,
  CashStatusBadge,
  PayoutStatusBadge,
} from '@/components/jobs/job-badges'
import { JobDetailActions } from '@/components/jobs/job-detail-actions'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params

  const job = await prisma.job.findUnique({
    where: { id },
    include: { serviceType: true, employee: true, customer: true },
  })

  if (!job) notFound()

  const isAdmin = user.role === 'ADMIN'
  // Employees may only view their own jobs.
  if (!isAdmin && job.employeeId !== user.id) redirect('/jobs')

  const end = addMinutes(job.startTime, job.durationMins)
  const empShare = employeeShareCents(job.priceCents, job.employeeSplitPercent)
  const adminShare = adminShareCents(job.priceCents, job.employeeSplitPercent)
  const empTotal = employeeTotalCents(job)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" render={<Link href="/jobs" />} aria-label="Back to jobs">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold md:text-3xl">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ServiceBadge name={job.serviceType.name} color={job.serviceType.color} />
            <JobStatusBadge status={job.status} />
            {isAdmin && <CashStatusBadge status={job.cashStatus} />}
            <PayoutStatusBadge status={job.payoutStatus} />
          </div>
        </div>
      </div>

      {/* Interactive controls (role-aware) */}
      <JobDetailActions
        job={{
          id: job.id,
          status: job.status,
          cashStatus: job.cashStatus,
          payoutStatus: job.payoutStatus,
          tipCents: job.tipCents,
        }}
        isAdmin={isAdmin}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Date" value={format(job.startTime, 'EEEE, MMM d, yyyy')} />
            <Row
              label="Time"
              value={`${format(job.startTime, 'h:mm a')} – ${format(end, 'h:mm a')}`}
            />
            <Row label="Duration" value={`${job.durationMins} min`} />
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {job.customer ? (
              <>
                <Row label="Name" value={job.customer.name} />
                {job.customer.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Phone</span>
                    <a
                      href={`tel:${job.customer.phone}`}
                      className="inline-flex items-center gap-1 font-medium text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {job.customer.phone}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No linked customer</p>
            )}
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">Address</span>
              <span className="flex items-center gap-1 text-right font-medium">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {job.address}
              </span>
            </div>
            <Row label="Neighborhood" value={job.neighborhood} />
          </CardContent>
        </Card>

        {/* Money */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Money</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Job price" value={formatMoney(job.priceCents)} mono />
            {job.tipCents > 0 && <Row label="Tip" value={formatMoney(job.tipCents)} mono />}
            <Separator className="my-1" />
            {isAdmin ? (
              <>
                <Row
                  label={`Employee payout (${job.employeeSplitPercent}% + tips)`}
                  value={formatMoney(empTotal)}
                  mono
                />
                <Row
                  label={`Your net (${100 - job.employeeSplitPercent}%)`}
                  value={formatMoney(adminShare)}
                  mono
                  strong
                />
              </>
            ) : (
              <Row label="You earn (incl. tips)" value={formatMoney(empTotal)} mono strong />
            )}
            {isAdmin && (
              <p className="pt-1 text-xs text-muted-foreground">
                Base share {formatMoney(empShare)} + tip {formatMoney(job.tipCents)}. Tips go
                100% to the employee.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        <NoteCard title="Customer comments" text={job.customerComments} />
        <NoteCard title="Job specifications" text={job.specifications} />
        <NoteCard title="Completion notes" text={job.completionNotes} />
        {isAdmin && <NoteCard title="Internal admin notes" text={job.adminNotes} admin />}
      </div>

      <p className="text-xs text-muted-foreground">
        Assigned to {job.employee?.name ?? 'Unassigned'} · Created{' '}
        {format(job.createdAt, 'MMM d, yyyy')} · Updated {format(job.updatedAt, 'MMM d, yyyy')}
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string
  value: string
  mono?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? 'tabular-nums ' : ''}${strong ? 'font-semibold' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

function NoteCard({ title, text, admin }: { title: string; text: string | null; admin?: boolean }) {
  if (!text) return null
  return (
    <Card className={admin ? 'border-amber-500/30' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}
