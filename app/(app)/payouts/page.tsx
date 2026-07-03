import {
  Banknote,
  CircleDollarSign,
  HandCoins,
  PiggyBank,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/payouts/stat-card'
import { PayoutFilters } from '@/components/payouts/payout-filters'
import { EmployeePayoutSection } from '@/components/payouts/employee-payout-section'
import { EmployeeEarningsList } from '@/components/payouts/employee-earnings-list'
import { PayoutHistory } from '@/components/payouts/payout-history'
import {
  getAdminPayoutsData,
  getMyPayoutsData,
  type PayoutsFilter,
} from './data'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  employee?: string
  status?: string
  from?: string
  to?: string
}>

/** Parse a YYYY-MM-DD string into a Date, or undefined if malformed. */
function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const d = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await requireUser()

  if (user.role !== 'ADMIN') {
    return <EmployeePayoutsView userId={user.id} />
  }

  const sp = await searchParams
  const filter: PayoutsFilter = {
    employeeId: sp.employee || undefined,
    status: sp.status === 'paid' || sp.status === 'unpaid' ? sp.status : undefined,
    from: parseDate(sp.from),
    to: parseDate(sp.to, true),
  }

  const [{ summary, sections }, employees] = await Promise.all([
    getAdminPayoutsData(filter),
    prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Pay your team their 80/20 share and keep a record of every payout.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total owed"
          cents={summary.totalOwedCents}
          icon={Wallet}
          hint="Across all employees"
          accent
        />
        <StatCard
          label="Total paid"
          cents={summary.totalPaidCents}
          icon={Banknote}
          hint="All time"
        />
        <StatCard
          label="Tips paid"
          cents={summary.totalTipsCents}
          icon={HandCoins}
          hint="All time, 100% to employees"
        />
      </div>

      {/* Filters */}
      <PayoutFilters employees={employees} />

      {/* Per-employee sections */}
      {sections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <EmployeePayoutSection key={section.employeeId} section={section} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CircleDollarSign className="h-6 w-6" />
      </div>
      <p className="mt-4 font-medium">Nothing to pay out</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        No employees have completed, unpaid jobs in this range. Payouts appear
        here once jobs are finished.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Employee self-view (same route, role-branched)
// ---------------------------------------------------------------------------

async function EmployeePayoutsView({ userId }: { userId: string }) {
  const { stats, jobs, history } = await getMyPayoutsData(userId)

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">Earnings</h1>
        <p className="text-sm text-muted-foreground">
          Your share of every completed job, plus your payout history.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Unpaid balance"
          cents={stats.unpaidBalanceCents}
          icon={Wallet}
          hint="Owed to you"
          accent
        />
        <StatCard
          label="Paid this week"
          cents={stats.paidThisWeekCents}
          icon={Banknote}
        />
        <StatCard
          label="Paid lifetime"
          cents={stats.paidLifetimeCents}
          icon={PiggyBank}
        />
        <StatCard
          label="Tips lifetime"
          cents={stats.tipsLifetimeCents}
          icon={Sparkles}
        />
      </div>

      {/* Earnings list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Job earnings</h2>
        <EmployeeEarningsList jobs={jobs} />
      </section>

      {/* Payout history */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payout history</h2>
        <PayoutHistory
          batches={history}
          emptyLabel="You haven't been paid out yet. Payouts from the owner will show up here."
        />
      </section>
    </div>
  )
}
