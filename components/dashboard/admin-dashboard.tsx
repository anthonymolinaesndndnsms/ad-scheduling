import Link from 'next/link'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns'
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Plus,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import {
  formatMoney,
  adminShareCents,
  employeeTotalCents,
} from '@/lib/money'
import { JOB_STATUS_LABELS, JOB_STATUS_CLASSES } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'

export const dynamic = 'force-dynamic'

export async function AdminDashboard() {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [
    allJobs,
    jobsToday,
    jobsThisWeek,
    jobsThisMonth,
    upcoming,
    activeEmployees,
  ] = await Promise.all([
    // Every job — money totals aggregate over all statuses per the money spec.
    prisma.job.findMany({
      select: {
        priceCents: true,
        tipCents: true,
        employeeSplitPercent: true,
        status: true,
        cashStatus: true,
        payoutStatus: true,
      },
    }),
    prisma.job.count({ where: { startTime: { gte: dayStart, lte: dayEnd } } }),
    prisma.job.count({
      where: { startTime: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.job.count({
      where: { startTime: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.job.findMany({
      where: { status: 'PENDING', startTime: { gte: now } },
      orderBy: { startTime: 'asc' },
      take: 6,
      select: {
        id: true,
        title: true,
        startTime: true,
        neighborhood: true,
        priceCents: true,
        status: true,
        employee: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'EMPLOYEE', active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        jobs: {
          where: {
            OR: [
              { startTime: { gte: dayStart, lte: dayEnd } },
              { status: 'COMPLETED', completedAt: { gte: weekStart, lte: weekEnd } },
              { status: 'COMPLETED', payoutStatus: 'UNPAID' },
            ],
          },
          select: {
            priceCents: true,
            tipCents: true,
            employeeSplitPercent: true,
            startTime: true,
            status: true,
            payoutStatus: true,
            completedAt: true,
          },
        },
      },
    }),
  ])

  // ---- Money + count aggregates (canonical math from lib/money) ----
  let grossCents = 0
  let netCents = 0
  let payoutsOwedCents = 0
  let cashCollectedCents = 0
  let cashOutstandingCents = 0
  let completedCount = 0
  let pendingCount = 0

  for (const j of allJobs) {
    grossCents += j.priceCents
    netCents += adminShareCents(j.priceCents, j.employeeSplitPercent)
    if (j.status === 'COMPLETED') {
      completedCount += 1
      if (j.payoutStatus === 'UNPAID') payoutsOwedCents += employeeTotalCents(j)
      if (j.cashStatus === 'OUTSTANDING') cashOutstandingCents += j.priceCents
    } else {
      pendingCount += 1
    }
    if (j.cashStatus === 'COLLECTED') cashCollectedCents += j.priceCents
  }

  const payoutsAgg = await prisma.payout.aggregate({
    _sum: { amountCents: true, tipCents: true },
  })
  const payoutsPaidCents =
    (payoutsAgg._sum.amountCents ?? 0) + (payoutsAgg._sum.tipCents ?? 0)

  const avgJobPriceCents =
    allJobs.length > 0 ? Math.round(grossCents / allJobs.length) : 0

  // ---- Per-employee team activity ----
  const team = activeEmployees.map((e) => {
    let today = 0
    let completedThisWeek = 0
    let owedCents = 0
    for (const j of e.jobs) {
      if (j.startTime >= dayStart && j.startTime <= dayEnd) today += 1
      if (
        j.status === 'COMPLETED' &&
        j.completedAt &&
        j.completedAt >= weekStart &&
        j.completedAt <= weekEnd
      ) {
        completedThisWeek += 1
      }
      if (j.status === 'COMPLETED' && j.payoutStatus === 'UNPAID') {
        owedCents += employeeTotalCents(j)
      }
    }
    return { id: e.id, name: e.name, today, completedThisWeek, owedCents }
  })

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(now, 'EEEE, MMMM d')} · business overview
        </p>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        <StatCard
          label="Gross revenue"
          value={formatMoney(grossCents)}
          icon={TrendingUp}
          hint="All jobs, all time"
        />
        <StatCard
          label="Net revenue"
          value={formatMoney(netCents)}
          icon={DollarSign}
          hint="Owner share after splits"
        />
        <StatCard
          label="Payouts owed"
          value={formatMoney(payoutsOwedCents)}
          icon={Wallet}
          hint="Completed & unpaid"
          emphasis={payoutsOwedCents > 0}
        />
        <StatCard
          label="Payouts paid"
          value={formatMoney(payoutsPaidCents)}
          icon={Receipt}
          hint="All payout batches"
        />
        <StatCard
          label="Cash collected"
          value={formatMoney(cashCollectedCents)}
          icon={Banknote}
        />
        <StatCard
          label="Cash outstanding"
          value={formatMoney(cashOutstandingCents)}
          icon={Clock}
          hint="Completed, not collected"
          emphasis={cashOutstandingCents > 0}
        />
        <StatCard
          label="Avg job price"
          value={formatMoney(avgJobPriceCents)}
          icon={DollarSign}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          hint={`${pendingCount} pending`}
        />
        <StatCard label="Jobs today" value={jobsToday} icon={CalendarClock} />
        <StatCard label="This week" value={jobsThisWeek} icon={CalendarDays} />
        <StatCard label="This month" value={jobsThisMonth} icon={CalendarDays} />
        <StatCard label="Pending" value={pendingCount} icon={Clock} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming jobs */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4 md:p-5">
            <div>
              <h2 className="text-base font-semibold">Upcoming jobs</h2>
              <p className="text-xs text-muted-foreground">
                Next {upcoming.length || ''} pending by start time
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/calendar" />}
            >
              Calendar
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No upcoming jobs scheduled.
              </p>
              <Button size="sm" render={<Link href="/jobs/new" />}>
                <Plus className="h-4 w-4" />
                Schedule a job
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((job) => (
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
                          {format(job.startTime, 'h:mm a')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.neighborhood}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {job.employee?.name ?? 'Unassigned'}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {formatMoney(job.priceCents)}
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

        {/* Team activity */}
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4 md:p-5">
            <div>
              <h2 className="text-base font-semibold">Team activity</h2>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/employees" />}
            >
              All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {team.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No active employees yet.
              </p>
              <Button size="sm" render={<Link href="/signup" />}>
                <UserPlus className="h-4 w-4" />
                Invite an employee
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {team.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/employees/${e.id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50 md:px-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(e.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.today} today · {e.completedThisWeek} done this week
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">Owed</p>
                      <p className="font-semibold tabular-nums">
                        {formatMoney(e.owedCents)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/jobs/new"
          icon={Plus}
          title="New job"
          subtitle="Schedule and assign work"
        />
        <QuickAction
          href="/signup"
          icon={UserPlus}
          title="New employee"
          subtitle="Share this signup link to onboard"
        />
        <QuickAction
          href="/payouts"
          icon={DollarSign}
          title="Payouts"
          subtitle="Pay out completed jobs"
        />
      </section>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string
  icon: typeof Plus
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 md:p-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
