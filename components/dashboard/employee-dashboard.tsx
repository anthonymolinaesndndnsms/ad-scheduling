import Link from 'next/link'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  format,
  isToday,
  isTomorrow,
} from 'date-fns'
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatMoney, employeeTotalCents } from '@/lib/money'
import { JOB_STATUS_LABELS, JOB_STATUS_CLASSES } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import { RangeTabs } from '@/components/dashboard/range-tabs'

export const dynamic = 'force-dynamic'

export type EmployeeRange = 'today' | 'week' | 'all'

const RANGE_LABEL: Record<EmployeeRange, string> = {
  today: 'today',
  week: 'this week',
  all: 'all time',
}

export async function EmployeeDashboard({
  userId,
  range,
}: {
  userId: string
  range: EmployeeRange
}) {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Window that scopes the range-sensitive stat cards.
  const rangeWhere =
    range === 'today'
      ? { startTime: { gte: dayStart, lte: dayEnd } }
      : range === 'week'
        ? { startTime: { gte: weekStart, lte: weekEnd } }
        : {}

  const [me, rangeJobs, jobsToday, jobsThisWeek, listJobs, unpaidJobs] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      // Jobs in the selected range — earnings + gross value for this employee.
      prisma.job.findMany({
        where: { employeeId: userId, ...rangeWhere },
        select: {
          priceCents: true,
          tipCents: true,
          employeeSplitPercent: true,
          status: true,
        },
      }),
      prisma.job.count({
        where: {
          employeeId: userId,
          startTime: { gte: dayStart, lte: dayEnd },
        },
      }),
      prisma.job.count({
        where: {
          employeeId: userId,
          startTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      // Upcoming pending first, then recent completed — their own jobs only.
      prisma.job.findMany({
        where: {
          employeeId: userId,
          OR: [
            { status: 'PENDING', startTime: { gte: dayStart } },
            { status: 'COMPLETED' },
          ],
        },
        orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
        take: 12,
        select: {
          id: true,
          title: true,
          startTime: true,
          address: true,
          neighborhood: true,
          priceCents: true,
          tipCents: true,
          employeeSplitPercent: true,
          status: true,
          completedAt: true,
          serviceType: { select: { name: true } },
        },
      }),
      // Unpaid balance is always all-time (COMPLETED + UNPAID).
      prisma.job.findMany({
        where: {
          employeeId: userId,
          status: 'COMPLETED',
          payoutStatus: 'UNPAID',
        },
        select: {
          priceCents: true,
          tipCents: true,
          employeeSplitPercent: true,
        },
      }),
    ])

  // ---- Range-scoped aggregates ----
  let rangeCompleted = 0
  let rangePending = 0
  let assignedGrossCents = 0
  let expectedEarningsCents = 0
  for (const j of rangeJobs) {
    assignedGrossCents += j.priceCents
    expectedEarningsCents += employeeTotalCents(j)
    if (j.status === 'COMPLETED') rangeCompleted += 1
    else rangePending += 1
  }

  const unpaidBalanceCents = unpaidJobs.reduce(
    (sum, j) => sum + employeeTotalCents(j),
    0,
  )

  // ---- Split the list: upcoming pending first (chronological), then recent completed ----
  const pending = listJobs
    .filter((j) => j.status === 'PENDING')
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  const completed = listJobs
    .filter((j) => j.status === 'COMPLETED')
    .sort((a, b) => {
      const at = (a.completedAt ?? a.startTime).getTime()
      const bt = (b.completedAt ?? b.startTime).getTime()
      return bt - at
    })
  const orderedJobs = [...pending, ...completed]

  // ---- "Up next" reminder: a PENDING job starting within the next 2 hours ----
  const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const upNext = pending.find(
    (j) => j.startTime >= now && j.startTime <= twoHours,
  )

  const firstName = (me?.name ?? 'there').split(/\s+/)[0]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold">Hi, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s your work {RANGE_LABEL[range]}.
        </p>
      </div>

      {/* Up next reminder */}
      {upNext ? (
        <Link
          href={`/jobs/${upNext.id}`}
          className="block rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10 md:p-5"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Up next · {format(upNext.startTime, 'h:mm a')}
              </p>
              <p className="truncate font-semibold">{upNext.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {upNext.serviceType.name} · {upNext.neighborhood}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">You earn</p>
              <p className="font-semibold tabular-nums">
                {formatMoney(employeeTotalCents(upNext))}
              </p>
            </div>
          </div>
        </Link>
      ) : null}

      {/* Range filter */}
      <RangeTabs current={range} />

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 md:gap-4">
        <StatCard label="Jobs today" value={jobsToday} icon={CalendarClock} />
        <StatCard label="Jobs this week" value={jobsThisWeek} icon={CalendarDays} />
        <StatCard
          label={`Completed (${RANGE_LABEL[range]})`}
          value={rangeCompleted}
          icon={CheckCircle2}
          hint={`${rangePending} pending`}
        />
        <StatCard
          label="Assigned value"
          value={formatMoney(assignedGrossCents)}
          icon={Wrench}
          hint={`Gross ${RANGE_LABEL[range]}`}
        />
        <StatCard
          label="Expected earnings"
          value={formatMoney(expectedEarningsCents)}
          icon={Wallet}
          hint={`Your share ${RANGE_LABEL[range]}`}
        />
        <StatCard
          label="Unpaid balance"
          value={formatMoney(unpaidBalanceCents)}
          icon={Wallet}
          hint="Completed, not yet paid"
          emphasis={unpaidBalanceCents > 0}
        />
      </section>

      {/* Job list */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 md:p-5">
          <div>
            <h2 className="text-base font-semibold">Your jobs</h2>
            <p className="text-xs text-muted-foreground">
              Upcoming first, then recently completed
            </p>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/jobs" />}>
            All
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {orderedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No jobs assigned to you yet. New assignments will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orderedJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 md:px-5"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5 text-center">
                    <span className="text-[0.7rem] font-medium uppercase text-muted-foreground">
                      {format(job.startTime, 'MMM')}
                    </span>
                    <span className="text-lg font-bold leading-none tabular-nums">
                      {format(job.startTime, 'd')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{job.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {whenLabel(job.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {job.serviceType.name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.neighborhood}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">
                      {formatMoney(employeeTotalCents(job))}
                    </span>
                    <Badge
                      variant="outline"
                      className={JOB_STATUS_CLASSES[job.status]}
                    >
                      {JOB_STATUS_LABELS[job.status]}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function whenLabel(d: Date): string {
  if (isToday(d)) return `Today ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `Tomorrow ${format(d, 'h:mm a')}`
  return format(d, 'MMM d, h:mm a')
}
