import Link from 'next/link'
import { format } from 'date-fns'
import { Briefcase, Clock, MapPin, User } from 'lucide-react'
import type { JobStatus, CashStatus, PayoutStatus } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  ServiceBadge,
  ServiceDot,
  JobStatusBadge,
  CashStatusBadge,
  PayoutStatusBadge,
} from '@/components/jobs/job-badges'

export type JobListItem = {
  id: string
  title: string
  startTime: Date
  priceCents: number
  status: JobStatus
  cashStatus: CashStatus
  payoutStatus: PayoutStatus
  service: { name: string; color: string | null }
  customerName: string | null
  employeeName: string | null
  neighborhood: string
}

export function JobsList({
  jobs,
  isAdmin,
}: {
  jobs: JobListItem[]
  isAdmin: boolean
}) {
  const pending = jobs.filter((j) => j.status === 'PENDING')
  const done = jobs.filter((j) => j.status !== 'PENDING')
  const ordered = [...pending, ...done]

  return (
    <>
      {/* Mobile / tablet: stacked cards */}
      <div className="space-y-3 lg:hidden">
        {ordered.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{job.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <ServiceBadge name={job.service.name} color={job.service.color} />
                </div>
              </div>
              <p className="shrink-0 font-medium tabular-nums">
                {formatMoney(job.priceCents)}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
              {job.customerName && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0" />
                  {job.customerName}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                {format(job.startTime, 'EEE, MMM d · h:mm a')}
              </span>
              {isAdmin && (
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  {job.employeeName ?? 'Unassigned'}
                </span>
              )}
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                {job.neighborhood}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <JobStatusBadge status={job.status} />
              {isAdmin && <CashStatusBadge status={job.cashStatus} />}
              {isAdmin && <PayoutStatusBadge status={job.payoutStatus} />}
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Customer</TableHead>
              {isAdmin && <TableHead>Employee</TableHead>}
              <TableHead>Date &amp; time</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((job) => (
              <TableRow
                key={job.id}
                className={cn(
                  'cursor-pointer',
                  job.status === 'PENDING' && 'bg-amber-500/[0.03]'
                )}
              >
                <TableCell className="font-medium">
                  <Link href={`/jobs/${job.id}`} className="block hover:underline">
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ServiceDot color={job.service.color} />
                    {job.service.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {job.customerName ?? '—'}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-muted-foreground">
                    {job.employeeName ?? 'Unassigned'}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {format(job.startTime, 'MMM d, yyyy · h:mm a')}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(job.priceCents)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <JobStatusBadge status={job.status} />
                    {isAdmin && <CashStatusBadge status={job.cashStatus} />}
                    {isAdmin && <PayoutStatusBadge status={job.payoutStatus} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
