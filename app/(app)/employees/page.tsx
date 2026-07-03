import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Phone,
  UsersRound,
} from 'lucide-react'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { formatMoney, employeeTotalCents } from '@/lib/money'
import { ROLE_LABELS } from '@/lib/labels'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CopySignupLink } from '@/components/employees/copy-signup-link'
import { initials, weekRange, dayRange } from '@/components/employees/utils'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  await requireAdmin()

  const { start: weekStart, end: weekEnd } = weekRange()
  const { start: dayStart, end: dayEnd } = dayRange()

  const [users, unpaidJobs] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: 'desc' }, { role: 'asc' }, { name: 'asc' }],
      include: {
        // This week's jobs (used for jobs today / completed / earned this week).
        jobs: {
          where: { startTime: { gte: weekStart, lte: weekEnd } },
          select: {
            status: true,
            startTime: true,
            priceCents: true,
            tipCents: true,
            employeeSplitPercent: true,
          },
        },
        _count: {
          select: {
            // Currently pending (all-time backlog assigned to them).
            jobs: { where: { status: 'PENDING' } },
          },
        },
        payouts: { select: { amountCents: true, tipCents: true } },
      },
    }),
    // All-time unpaid balance = completed + unpaid jobs, across all dates.
    prisma.job.findMany({
      where: { status: 'COMPLETED', payoutStatus: 'UNPAID', employeeId: { not: null } },
      select: {
        employeeId: true,
        priceCents: true,
        tipCents: true,
        employeeSplitPercent: true,
      },
    }),
  ])

  const unpaidByUser = new Map<string, number>()
  for (const job of unpaidJobs) {
    if (!job.employeeId) continue
    unpaidByUser.set(
      job.employeeId,
      (unpaidByUser.get(job.employeeId) ?? 0) + employeeTotalCents(job),
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Everyone with an account — owners and employees.
        </p>
      </div>

      <CopySignupLink />

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UsersRound className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No team members yet</p>
              <p className="text-sm text-muted-foreground">
                Share the signup link above so your crew can create accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => {
            const jobsToday = user.jobs.filter(
              (j) => j.startTime >= dayStart && j.startTime <= dayEnd,
            ).length
            const completedThisWeek = user.jobs.filter(
              (j) => j.status === 'COMPLETED',
            )
            const earnedThisWeekCents = completedThisWeek.reduce(
              (sum, j) => sum + employeeTotalCents(j),
              0,
            )
            const unpaidCents = user.jobs.reduce(
              (sum, j) =>
                j.status === 'COMPLETED' ? sum + employeeTotalCents(j) : sum,
              0,
            )
            // Unpaid balance across ALL time is computed on the profile; here we
            // approximate live activity — show unpaid from this week's completed
            // jobs only if needed. Keep lifetime paid exact from payout records.
            const lifetimePaidCents = user.payouts.reduce(
              (sum, p) => sum + p.amountCents + p.tipCents,
              0,
            )

            return (
              <Link
                key={user.id}
                href={`/employees/${user.id}`}
                className="group block"
              >
                <Card className="h-full transition-colors group-hover:ring-foreground/20">
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar size="lg">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-foreground">
                            {user.name}
                          </p>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          @{user.username}
                          {user.email ? ` · ${user.email}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">
                            {ROLE_LABELS[user.role]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              user.active
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                            }
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {user.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {user.phone}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border p-3">
                      <MiniStat
                        icon={<Briefcase className="h-3.5 w-3.5" />}
                        label="Today"
                        value={jobsToday}
                      />
                      <MiniStat
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        label="Done / wk"
                        value={completedThisWeek.length}
                      />
                      <MiniStat
                        icon={<Clock className="h-3.5 w-3.5" />}
                        label="Pending"
                        value={user._count.jobs}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <MoneyStat
                        label="Earned / wk"
                        value={formatMoney(earnedThisWeekCents)}
                      />
                      <MoneyStat
                        label="Unpaid"
                        value={formatMoney(unpaidCents)}
                        emphasis={unpaidCents > 0}
                      />
                      <MoneyStat
                        label="Lifetime paid"
                        value={formatMoney(lifetimePaidCents)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-base font-semibold tabular-nums leading-none">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function MoneyStat({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          'text-sm font-semibold tabular-nums ' +
          (emphasis ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')
        }
      >
        {value}
      </p>
    </div>
  )
}
