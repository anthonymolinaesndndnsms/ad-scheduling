import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ArrowLeft, Plus } from 'lucide-react'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { formatMoney, employeeTotalCents } from '@/lib/money'
import { ROLE_LABELS } from '@/lib/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { JobStatusBadge, ServiceDot } from '@/components/jobs/job-badges'
import { ActivateSwitch } from '@/components/employees/activate-switch'
import { RoleToggle } from '@/components/employees/role-toggle'
import { EmployeeNotes } from '@/components/employees/employee-notes'
import { PhoneEditor } from '@/components/employees/phone-editor'
import { ServicesEditor } from '@/components/employees/services-editor'
import {
  AvailabilityEditor,
  type AvailabilityRow,
} from '@/components/employees/availability-editor'
import { AdminResetPassword } from '@/components/employees/admin-reset-password'
import { EditProfileForm } from '@/components/account/edit-profile-form'
import { ChangePasswordForm } from '@/components/account/change-password-form'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const viewer = await requireUser()
  const { id } = await params

  // Employees may only view their own profile.
  if (viewer.role !== 'ADMIN' && viewer.id !== id) redirect('/dashboard')
  const isAdmin = viewer.role === 'ADMIN'

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const [employee, allServices] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        services: { select: { id: true } },
        availability: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        jobs: {
          include: { serviceType: true, customer: true },
          orderBy: { startTime: 'desc' },
        },
        payouts: { orderBy: { paidAt: 'desc' }, take: 20 },
      },
    }),
    prisma.serviceType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ])

  if (!employee) notFound()

  const jobs = employee.jobs
  const completed = jobs.filter((j) => j.status === 'COMPLETED')
  const weekJobs = jobs.filter((j) => j.startTime >= weekStart && j.startTime <= weekEnd)
  const lifetimeEarnings = completed.reduce((s, j) => s + employeeTotalCents(j), 0)
  const weekEarnings = weekJobs
    .filter((j) => j.status === 'COMPLETED')
    .reduce((s, j) => s + employeeTotalCents(j), 0)
  const unpaid = completed
    .filter((j) => j.payoutStatus === 'UNPAID')
    .reduce((s, j) => s + employeeTotalCents(j), 0)
  const lifetimePaid = employee.payouts.reduce((s, p) => s + p.amountCents + p.tipCents, 0)

  const currentJob = jobs.find(
    (j) =>
      j.status === 'PENDING' &&
      j.startTime <= now &&
      new Date(j.startTime.getTime() + j.durationMins * 60000) >= now
  )
  const nextJob = jobs
    .filter((j) => j.status === 'PENDING' && j.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]

  const settings = await getSettings()
  const availabilityRows: AvailabilityRow[] = employee.availability.map((a) => ({
    id: a.id,
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
    maxJobsPerDay: a.maxJobsPerDay,
    notes: a.notes,
  }))
  const canEditAvailability = isAdmin || viewer.id === id

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button variant="ghost" size="icon" render={<Link href="/employees" />} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-2xl font-bold md:text-3xl">Profile</h1>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{initials(employee.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{employee.name}</h2>
                <Badge variant="outline">{ROLE_LABELS[employee.role]}</Badge>
                {!employee.active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                @{employee.username}
                {employee.email ? ` · ${employee.email}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Member since {format(employee.createdAt, 'MMM yyyy')}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button render={<Link href={`/jobs/new?employeeId=${employee.id}`} />}>
                <Plus className="h-4 w-4" />
                Add job
              </Button>
              <ActivateSwitch userId={employee.id} active={employee.active} />
              <RoleToggle userId={employee.id} role={employee.role} name={employee.name} />
              {viewer.id !== employee.id && (
                <AdminResetPassword userId={employee.id} name={employee.name} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account: only visible on your own profile */}
      {viewer.id === employee.id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EditProfileForm initialName={employee.name} initialEmail={employee.email ?? ''} />
            <div className="border-t border-border pt-6">
              <h3 className="mb-3 text-sm font-medium">Change password</h3>
              <ChangePasswordForm />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact + right now */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PhoneEditor userId={employee.id} initialPhone={employee.phone ?? ''} canEdit={canEditAvailability} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Right now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current job</p>
              {currentJob ? (
                <Link href={`/jobs/${currentJob.id}`} className="font-medium text-primary">
                  {currentJob.title} · {format(currentJob.startTime, 'h:mm a')}
                </Link>
              ) : (
                <p className="text-muted-foreground">Nothing in progress</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next job</p>
              {nextJob ? (
                <Link href={`/jobs/${nextJob.id}`} className="font-medium text-primary">
                  {nextJob.title} · {format(nextJob.startTime, 'EEE h:mm a')}
                </Link>
              ) : (
                <p className="text-muted-foreground">None scheduled</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Jobs completed" value={String(completed.length)} />
        <Stat label="Jobs this week" value={String(weekJobs.length)} />
        <Stat label="Earnings this week" value={formatMoney(weekEarnings)} />
        <Stat label="Lifetime earnings" value={formatMoney(lifetimeEarnings)} />
        <Stat label="Unpaid balance" value={formatMoney(unpaid)} highlight />
        <Stat label="Lifetime paid" value={formatMoney(lifetimePaid)} />
      </div>

      {/* Admin: services + notes */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned services</CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesEditor
                userId={employee.id}
                services={allServices.map((s) => ({ ...s, color: s.color ?? '#3b82f6' }))}
                assignedIds={employee.services.map((s) => s.id)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin notes</CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeNotes userId={employee.id} initialNotes={employee.notes ?? ''} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor userId={employee.id} entries={availabilityRows} canEdit={canEditAvailability} />
        </CardContent>
      </Card>

      {/* Job history */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Job history</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href={`/calendar?employee=${employee.id}`} />}>
            View calendar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            jobs.slice(0, 20).map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ServiceDot color={j.serviceType.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{j.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(j.startTime, 'MMM d, h:mm a')}
                      {j.customer ? ` · ${j.customer.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm tabular-nums">{formatMoney(employeeTotalCents(j))}</span>
                  <JobStatusBadge status={j.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Payout history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {employee.payouts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            employee.payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{format(p.paidAt, 'MMM d, yyyy')}</p>
                  {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(p.amountCents + p.tipCents)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
