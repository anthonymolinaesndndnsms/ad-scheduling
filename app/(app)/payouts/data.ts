import { prisma } from '@/lib/prisma'
import { employeeShareCents, adminShareCents, employeeTotalCents } from '@/lib/money'
import type { PayoutStatus } from '@prisma/client'

/**
 * Serialized job row used across the payouts UI. All money in integer cents;
 * dates are ISO strings so they can safely cross the server/client boundary.
 */
export type PayoutJob = {
  id: string
  title: string
  serviceName: string
  startTime: string
  priceCents: number
  tipCents: number
  employeeSplitPercent: number
  employeeShareCents: number
  adminShareCents: number
  employeeTotalCents: number
  payoutStatus: PayoutStatus
  cashStatus: 'OUTSTANDING' | 'COLLECTED'
  payoutId: string | null
}

export type PayoutBatch = {
  id: string
  employeeId: string
  employeeName: string
  amountCents: number
  tipCents: number
  totalCents: number
  note: string | null
  paidAt: string
  jobCount: number
  jobs: {
    id: string
    title: string
    startTime: string
    priceCents: number
    tipCents: number
    employeeTotalCents: number
  }[]
}

/** Aggregate totals for one employee within the active filter range. */
export type EmployeeTotals = {
  owedCents: number // Σ employeeTotal over COMPLETED + UNPAID jobs
  grossCents: number // Σ price over jobs in range
  netCents: number // Σ admin share over jobs in range
  tipsCents: number // Σ tips over jobs in range
  paidCents: number // Σ (amount + tips) over payout batches in range
}

export type EmployeeSection = {
  employeeId: string
  employeeName: string
  totals: EmployeeTotals
  unpaidJobs: PayoutJob[] // COMPLETED + UNPAID (the "Pay all" set)
  history: PayoutBatch[]
}

export type PayoutsFilter = {
  employeeId?: string
  status?: 'paid' | 'unpaid'
  from?: Date
  to?: Date
}

function serializeJob(job: {
  id: string
  title: string
  startTime: Date
  priceCents: number
  tipCents: number
  employeeSplitPercent: number
  payoutStatus: PayoutStatus
  cashStatus: 'OUTSTANDING' | 'COLLECTED'
  payoutId: string | null
  serviceType: { name: string }
}): PayoutJob {
  return {
    id: job.id,
    title: job.title,
    serviceName: job.serviceType.name,
    startTime: job.startTime.toISOString(),
    priceCents: job.priceCents,
    tipCents: job.tipCents,
    employeeSplitPercent: job.employeeSplitPercent,
    employeeShareCents: employeeShareCents(job.priceCents, job.employeeSplitPercent),
    adminShareCents: adminShareCents(job.priceCents, job.employeeSplitPercent),
    employeeTotalCents: employeeTotalCents(job),
    payoutStatus: job.payoutStatus,
    cashStatus: job.cashStatus,
    payoutId: job.payoutId,
  }
}

/** Date range clause for the `startTime` (jobs) or `paidAt` (payouts) column. */
function rangeClause(from?: Date, to?: Date) {
  if (!from && !to) return undefined
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
}

/**
 * The admin payouts dashboard payload: summary numbers across ALL employees
 * plus per-employee sections (only employees with an outstanding balance or
 * any history/activity in range).
 */
export async function getAdminPayoutsData(filter: PayoutsFilter) {
  const jobRange = rangeClause(filter.from, filter.to)

  // -- Summary cards (unaffected by range; whole-business snapshot) --------
  const [owedJobsAll, allPayoutAgg] = await Promise.all([
    prisma.job.findMany({
      where: { status: 'COMPLETED', payoutStatus: 'UNPAID', employeeId: { not: null } },
      select: { priceCents: true, tipCents: true, employeeSplitPercent: true },
    }),
    prisma.payout.aggregate({ _sum: { amountCents: true, tipCents: true } }),
  ])

  const totalOwedCents = owedJobsAll.reduce((s, j) => s + employeeTotalCents(j), 0)
  const totalPaidCents =
    (allPayoutAgg._sum.amountCents ?? 0) + (allPayoutAgg._sum.tipCents ?? 0)
  const totalTipsCents = allPayoutAgg._sum.tipCents ?? 0

  // -- Employees in scope --------------------------------------------------
  const employees = await prisma.user.findMany({
    where: filter.employeeId ? { id: filter.employeeId } : {},
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const sections: EmployeeSection[] = []

  for (const emp of employees) {
    // Jobs in the active range for gross/net/tips totals.
    const rangeJobs = await prisma.job.findMany({
      where: {
        employeeId: emp.id,
        ...(jobRange ? { startTime: jobRange } : {}),
      },
      select: {
        priceCents: true,
        tipCents: true,
        employeeSplitPercent: true,
      },
    })

    const grossCents = rangeJobs.reduce((s, j) => s + j.priceCents, 0)
    const netCents = rangeJobs.reduce(
      (s, j) => s + adminShareCents(j.priceCents, j.employeeSplitPercent),
      0
    )
    const tipsCents = rangeJobs.reduce((s, j) => s + j.tipCents, 0)

    // Outstanding, completed jobs awaiting payout (the "Pay all" set). Not
    // range-bound — owed money is owed regardless of the filter window.
    const unpaidRows = await prisma.job.findMany({
      where: { employeeId: emp.id, status: 'COMPLETED', payoutStatus: 'UNPAID' },
      orderBy: { startTime: 'asc' },
      include: { serviceType: { select: { name: true } } },
    })
    const unpaidJobs = unpaidRows.map(serializeJob)
    const owedCents = unpaidJobs.reduce((s, j) => s + j.employeeTotalCents, 0)

    // Payout history batches in the active range.
    const payoutRows = await prisma.payout.findMany({
      where: {
        employeeId: emp.id,
        ...(filter.from || filter.to
          ? { paidAt: rangeClause(filter.from, filter.to) }
          : {}),
      },
      orderBy: { paidAt: 'desc' },
      include: {
        jobs: {
          orderBy: { startTime: 'asc' },
          include: { serviceType: { select: { name: true } } },
        },
      },
    })
    const history = payoutRows.map(serializePayout)
    const paidCents = history.reduce((s, p) => s + p.totalCents, 0)

    // Skip employees with no owed balance AND no history/activity in range,
    // so the page stays focused. If a specific employee is filtered, always
    // show them.
    const hasActivity =
      owedCents > 0 || history.length > 0 || rangeJobs.length > 0
    if (!filter.employeeId && !hasActivity) continue

    // Respect the status filter for which sections to surface.
    if (filter.status === 'unpaid' && owedCents === 0 && !filter.employeeId) continue
    if (filter.status === 'paid' && history.length === 0 && !filter.employeeId) continue

    sections.push({
      employeeId: emp.id,
      employeeName: emp.name,
      totals: { owedCents, grossCents, netCents, tipsCents, paidCents },
      unpaidJobs,
      history,
    })
  }

  return {
    summary: { totalOwedCents, totalPaidCents, totalTipsCents },
    sections,
  }
}

function serializePayout(payout: {
  id: string
  employeeId: string
  amountCents: number
  tipCents: number
  note: string | null
  paidAt: Date
  jobs: {
    id: string
    title: string
    startTime: Date
    priceCents: number
    tipCents: number
    employeeSplitPercent: number
  }[]
}): PayoutBatch {
  return {
    id: payout.id,
    employeeId: payout.employeeId,
    employeeName: '',
    amountCents: payout.amountCents,
    tipCents: payout.tipCents,
    totalCents: payout.amountCents + payout.tipCents,
    note: payout.note,
    paidAt: payout.paidAt.toISOString(),
    jobCount: payout.jobs.length,
    jobs: payout.jobs.map((j) => ({
      id: j.id,
      title: j.title,
      startTime: j.startTime.toISOString(),
      priceCents: j.priceCents,
      tipCents: j.tipCents,
      employeeTotalCents: employeeTotalCents(j),
    })),
  }
}

/** Employee self-view: their earnings, jobs and payout history only. */
export async function getMyPayoutsData(userId: string) {
  const now = new Date()
  const weekStart = new Date(now)
  const day = weekStart.getDay() // 0 = Sun
  const diffToMonday = (day + 6) % 7
  weekStart.setDate(weekStart.getDate() - diffToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const [completedRows, payoutRows] = await Promise.all([
    prisma.job.findMany({
      where: { employeeId: userId, status: 'COMPLETED' },
      orderBy: { startTime: 'desc' },
      include: { serviceType: { select: { name: true } } },
    }),
    prisma.payout.findMany({
      where: { employeeId: userId },
      orderBy: { paidAt: 'desc' },
      include: {
        jobs: {
          orderBy: { startTime: 'asc' },
          include: { serviceType: { select: { name: true } } },
        },
      },
    }),
  ])

  const jobs = completedRows.map(serializeJob)

  const unpaidBalanceCents = jobs
    .filter((j) => j.payoutStatus === 'UNPAID')
    .reduce((s, j) => s + j.employeeTotalCents, 0)

  const history = payoutRows.map(serializePayout)

  const paidThisWeekCents = payoutRows
    .filter((p) => p.paidAt >= weekStart)
    .reduce((s, p) => s + p.amountCents + p.tipCents, 0)

  const paidLifetimeCents = payoutRows.reduce(
    (s, p) => s + p.amountCents + p.tipCents,
    0
  )
  const tipsLifetimeCents = payoutRows.reduce((s, p) => s + p.tipCents, 0)

  return {
    stats: {
      unpaidBalanceCents,
      paidThisWeekCents,
      paidLifetimeCents,
      tipsLifetimeCents,
    },
    jobs,
    history,
  }
}
