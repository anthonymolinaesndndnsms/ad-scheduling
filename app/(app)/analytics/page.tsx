import * as React from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Wallet,
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  Receipt,
  Coins,
  BarChart3,
} from 'lucide-react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  differenceInCalendarDays,
  isValid,
  parseISO,
} from 'date-fns'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import {
  formatMoney,
  adminShareCents,
  employeeShareCents,
  employeeTotalCents,
} from '@/lib/money'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { StatCard } from '@/components/analytics/stat-card'
import { DateRangeTabs, type RangePreset } from '@/components/analytics/date-range-tabs'
import {
  RevenueOverTimeChart,
  RevenueByServiceChart,
  RevenueByNeighborhoodChart,
  RevenueByEmployeeChart,
  JobsPerWeekChart,
  type RevenueOverTimePoint,
  type ServiceRevenuePoint,
  type NeighborhoodRevenuePoint,
  type EmployeeRevenuePoint,
  type JobsPerWeekPoint,
} from '@/components/analytics/charts'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* Range resolution                                                    */
/* ------------------------------------------------------------------ */

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

function resolveRange(
  preset: RangePreset,
  fromParam: string | undefined,
  toParam: string | undefined,
  now: Date
): { start: Date; end: Date; from: string; to: string } {
  // "All time" is unbounded on the low side; use a far-back anchor.
  const allStart = new Date(2000, 0, 1)

  if (preset === 'custom') {
    const parsedFrom = parseDateParam(fromParam)
    const parsedTo = parseDateParam(toParam)
    const start = parsedFrom ? startOfDay(parsedFrom) : allStart
    const end = parsedTo ? endOfDay(parsedTo) : endOfDay(now)
    return {
      start,
      end,
      from: parsedFrom ? format(parsedFrom, 'yyyy-MM-dd') : '',
      to: parsedTo ? format(parsedTo, 'yyyy-MM-dd') : '',
    }
  }

  let start: Date
  let end: Date
  switch (preset) {
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case '30d':
      start = startOfDay(subDays(now, 29))
      end = endOfDay(now)
      break
    case 'year':
      start = startOfYear(now)
      end = endOfYear(now)
      break
    case 'all':
    default:
      start = allStart
      end = endOfDay(now)
      break
  }
  return {
    start,
    end,
    from: format(start, 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()

  const sp = await searchParams
  const rawRange = typeof sp.range === 'string' ? sp.range : undefined
  const fromParam = typeof sp.from === 'string' ? sp.from : undefined
  const toParam = typeof sp.to === 'string' ? sp.to : undefined

  const validPresets: RangePreset[] = ['week', 'month', '30d', 'year', 'all', 'custom']
  let preset: RangePreset =
    rawRange && validPresets.includes(rawRange as RangePreset)
      ? (rawRange as RangePreset)
      : 'month'
  // If custom dates are supplied without an explicit range, treat as custom.
  if (!rawRange && (fromParam || toParam)) preset = 'custom'

  const now = new Date()
  const { start, end, from, to } = resolveRange(preset, fromParam, toParam, now)

  const settings = await getSettings().catch(() => null)
  const currency = settings?.currency ?? 'USD'

  // Pull the data we need. Jobs by startTime within range; payouts by paidAt.
  const [jobs, payouts, serviceTypes] = await Promise.all([
    prisma.job
      .findMany({
        where: { startTime: { gte: start, lte: end } },
        select: {
          id: true,
          priceCents: true,
          tipCents: true,
          employeeSplitPercent: true,
          status: true,
          cashStatus: true,
          payoutStatus: true,
          startTime: true,
          serviceTypeId: true,
          neighborhood: true,
          employeeId: true,
          employee: { select: { id: true, name: true } },
          serviceType: { select: { id: true, name: true, color: true } },
        },
      })
      .catch(() => []),
    prisma.payout
      .findMany({
        where: { paidAt: { gte: start, lte: end } },
        select: { amountCents: true, tipCents: true },
      })
      .catch(() => []),
    prisma.serviceType
      .findMany({ select: { id: true, name: true, color: true } })
      .catch(() => []),
  ])

  /* ---------------- Stat aggregates ---------------- */

  let grossCents = 0
  let netCents = 0
  let payoutOwedCents = 0
  let cashCollectedCents = 0
  let cashOutstandingCents = 0
  let jobsCompleted = 0
  let jobsPending = 0
  let tipsCents = 0

  for (const j of jobs) {
    grossCents += j.priceCents
    netCents += adminShareCents(j.priceCents, j.employeeSplitPercent)
    tipsCents += j.tipCents

    if (j.status === 'COMPLETED') jobsCompleted += 1
    if (j.status === 'PENDING') jobsPending += 1

    if (j.status === 'COMPLETED' && j.payoutStatus === 'UNPAID') {
      payoutOwedCents += employeeTotalCents({
        priceCents: j.priceCents,
        tipCents: j.tipCents,
        employeeSplitPercent: j.employeeSplitPercent,
      })
    }

    if (j.cashStatus === 'COLLECTED') {
      cashCollectedCents += j.priceCents
    }
    if (j.status === 'COMPLETED' && j.cashStatus === 'OUTSTANDING') {
      cashOutstandingCents += j.priceCents
    }
  }

  const payoutPaidCents = payouts.reduce(
    (sum, p) => sum + p.amountCents + p.tipCents,
    0
  )

  const avgJobPriceCents = jobs.length > 0 ? Math.round(grossCents / jobs.length) : 0

  /* ---------------- Chart series ---------------- */

  // Decide bucket granularity: daily for <= 60 days, weekly otherwise.
  const spanDays = differenceInCalendarDays(end, start)
  const useWeekly = spanDays > 60

  const revenueOverTime: RevenueOverTimePoint[] = buildRevenueSeries(
    jobs,
    start,
    end,
    useWeekly
  )

  // Revenue by service type (all services with any revenue in range).
  const serviceMap = new Map<string, { name: string; color: string; gross: number }>()
  for (const st of serviceTypes) {
    serviceMap.set(st.id, { name: st.name, color: st.color, gross: 0 })
  }
  for (const j of jobs) {
    const key = j.serviceTypeId
    const existing =
      serviceMap.get(key) ??
      {
        name: j.serviceType?.name ?? 'Unknown',
        color: j.serviceType?.color ?? 'var(--primary)',
        gross: 0,
      }
    existing.gross += j.priceCents
    serviceMap.set(key, existing)
  }
  const revenueByService: ServiceRevenuePoint[] = Array.from(serviceMap.values())
    .filter((s) => s.gross > 0)
    .sort((a, b) => b.gross - a.gross)
    .map((s) => ({ name: s.name, grossCents: s.gross, color: s.color }))

  // Revenue by neighborhood.
  const neighborhoodMap = new Map<string, number>()
  for (const j of jobs) {
    const key = j.neighborhood?.trim() || 'Unassigned'
    neighborhoodMap.set(key, (neighborhoodMap.get(key) ?? 0) + j.priceCents)
  }
  const revenueByNeighborhood: NeighborhoodRevenuePoint[] = Array.from(
    neighborhoodMap.entries()
  )
    .map(([name, grossCents]) => ({ name, grossCents }))
    .sort((a, b) => b.grossCents - a.grossCents)
    .slice(0, 12)

  // Revenue by employee (gross vs their earnings = split share + tips).
  const employeeMap = new Map<
    string,
    { name: string; gross: number; earnings: number }
  >()
  for (const j of jobs) {
    const id = j.employeeId ?? '__unassigned__'
    const name = j.employee?.name ?? 'Unassigned'
    const entry = employeeMap.get(id) ?? { name, gross: 0, earnings: 0 }
    entry.gross += j.priceCents
    entry.earnings +=
      employeeShareCents(j.priceCents, j.employeeSplitPercent) + j.tipCents
    employeeMap.set(id, entry)
  }
  const revenueByEmployee: EmployeeRevenuePoint[] = Array.from(employeeMap.values())
    .filter((e) => e.gross > 0)
    .sort((a, b) => b.gross - a.gross)
    .slice(0, 12)
    .map((e) => ({
      name: e.name,
      grossCents: e.gross,
      earningsCents: e.earnings,
    }))

  // Jobs completed per week (trend).
  const jobsPerWeek: JobsPerWeekPoint[] = buildJobsPerWeek(jobs, start, end)

  /* ---------------- Stat card rows ---------------- */

  const stats: {
    label: string
    value: string
    hint?: string
    icon: typeof DollarSign
    accent?: 'default' | 'emerald' | 'amber' | 'orange'
  }[] = [
    {
      label: 'Gross revenue',
      value: formatMoney(grossCents, currency),
      hint: `${jobs.length} job${jobs.length === 1 ? '' : 's'} in range`,
      icon: DollarSign,
    },
    {
      label: 'Net revenue',
      value: formatMoney(netCents, currency),
      hint: 'Your cut after splits',
      icon: TrendingUp,
      accent: 'emerald',
    },
    {
      label: 'Payouts owed',
      value: formatMoney(payoutOwedCents, currency),
      hint: 'Completed & unpaid',
      icon: Wallet,
      accent: 'amber',
    },
    {
      label: 'Payouts paid',
      value: formatMoney(payoutPaidCents, currency),
      hint: 'Recorded in range',
      icon: BadgeCheck,
      accent: 'emerald',
    },
    {
      label: 'Cash collected',
      value: formatMoney(cashCollectedCents, currency),
      icon: Banknote,
      accent: 'emerald',
    },
    {
      label: 'Cash outstanding',
      value: formatMoney(cashOutstandingCents, currency),
      hint: 'Completed, not collected',
      icon: CircleDollarSign,
      accent: 'orange',
    },
    {
      label: 'Jobs completed',
      value: String(jobsCompleted),
      icon: CheckCircle2,
      accent: 'emerald',
    },
    {
      label: 'Jobs pending',
      value: String(jobsPending),
      icon: Clock,
      accent: 'amber',
    },
    {
      label: 'Avg job price',
      value: formatMoney(avgJobPriceCents, currency),
      icon: Receipt,
    },
    {
      label: 'Total tips',
      value: formatMoney(tipsCents, currency),
      hint: '100% to employees',
      icon: Coins,
    },
  ]

  const hasAnyData = jobs.length > 0

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {preset === 'all'
            ? 'All-time performance across the business.'
            : `Performance from ${format(start, 'MMM d, yyyy')} to ${format(
                end,
                'MMM d, yyyy'
              )}.`}
        </p>
      </div>

      {/* Range controls */}
      <DateRangeTabs preset={preset} from={from} to={to} />

      {!hasAnyData ? (
        <Card className="items-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">No data for this range</p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Once jobs are scheduled and completed in this window, revenue and
              payout trends will appear here.
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="mt-1 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Schedule a job
          </Link>
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                hint={s.hint}
                icon={s.icon}
                accent={s.accent}
              />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue over time</CardTitle>
                <CardDescription>
                  Gross vs. net {useWeekly ? 'by week' : 'by day'} across the
                  selected range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueOverTimeChart data={revenueOverTime} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by service</CardTitle>
                <CardDescription>
                  Gross revenue grouped by service type.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueByServiceChart data={revenueByService} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by neighborhood</CardTitle>
                <CardDescription>
                  Where the work is coming from (top neighborhoods).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueByNeighborhoodChart data={revenueByNeighborhood} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by employee</CardTitle>
                <CardDescription>
                  Gross booked vs. each employee&apos;s earnings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueByEmployeeChart data={revenueByEmployee} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jobs completed per week</CardTitle>
                <CardDescription>
                  Weekly completion trend over the range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobsPerWeekChart data={jobsPerWeek} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Series builders                                                     */
/* ------------------------------------------------------------------ */

type JobRow = {
  priceCents: number
  employeeSplitPercent: number
  status: 'PENDING' | 'COMPLETED'
  startTime: Date
}

function buildRevenueSeries(
  jobs: JobRow[],
  start: Date,
  end: Date,
  useWeekly: boolean
): RevenueOverTimePoint[] {
  // Clamp the bucket span so "all time" doesn't explode into thousands of
  // points: for all-time / very wide custom ranges we anchor to the earliest
  // job with data.
  const earliest = jobs.reduce<Date | null>((min, j) => {
    if (!min || j.startTime < min) return j.startTime
    return min
  }, null)
  const rangeStart = earliest && earliest > start ? earliest : start
  const rangeEnd = end

  if (rangeStart > rangeEnd) return []

  const buckets = new Map<string, { gross: number; net: number }>()
  const keyFor = (d: Date) =>
    useWeekly
      ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfDay(d), 'yyyy-MM-dd')

  // Seed empty buckets so gaps render as zero.
  const intervalPoints = useWeekly
    ? eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 })
    : eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  // Cap to a sane number of points.
  const capped = intervalPoints.slice(-180)
  for (const d of capped) {
    buckets.set(keyFor(d), { gross: 0, net: 0 })
  }

  for (const j of jobs) {
    const key = keyFor(j.startTime)
    const bucket = buckets.get(key)
    if (!bucket) continue // outside capped window
    bucket.gross += j.priceCents
    bucket.net += adminShareCents(j.priceCents, j.employeeSplitPercent)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({
      label: format(parseISO(key), 'MMM d'),
      grossCents: v.gross,
      netCents: v.net,
    }))
}

function buildJobsPerWeek(
  jobs: { status: 'PENDING' | 'COMPLETED'; startTime: Date }[],
  start: Date,
  end: Date
): JobsPerWeekPoint[] {
  const completed = jobs.filter((j) => j.status === 'COMPLETED')
  if (completed.length === 0) return []

  const earliest = completed.reduce<Date>(
    (min, j) => (j.startTime < min ? j.startTime : min),
    completed[0].startTime
  )
  const rangeStart = earliest > start ? earliest : start
  if (rangeStart > end) return []

  const weeks = eachWeekOfInterval(
    { start: rangeStart, end },
    { weekStartsOn: 1 }
  ).slice(-52)

  const buckets = new Map<string, number>()
  for (const w of weeks) {
    buckets.set(format(w, 'yyyy-MM-dd'), 0)
  }
  for (const j of completed) {
    const key = format(startOfWeek(j.startTime, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => ({ label: format(parseISO(key), 'MMM d'), count }))
}
