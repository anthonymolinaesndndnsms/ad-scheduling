import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { JobsFilterBar, type FilterOption } from '@/components/jobs/jobs-filter-bar'
import { JobsList, type JobListItem } from '@/components/jobs/jobs-list'

export const dynamic = 'force-dynamic'

type SearchParams = {
  employee?: string
  status?: string
  cashStatus?: string
  payoutStatus?: string
  serviceTypeId?: string
  neighborhood?: string
  from?: string
  to?: string
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  if (endOfDay) d.setHours(23, 59, 59, 999)
  else d.setHours(0, 0, 0, 0)
  return d
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const sp = await searchParams

  const where: Prisma.JobWhereInput = {}

  // Employees only ever see their own jobs.
  if (!isAdmin) {
    where.employeeId = user.id
  } else if (sp.employee) {
    where.employeeId = sp.employee
  }

  if (sp.status === 'PENDING' || sp.status === 'COMPLETED') {
    where.status = sp.status
  }
  if (isAdmin && (sp.cashStatus === 'OUTSTANDING' || sp.cashStatus === 'COLLECTED')) {
    where.cashStatus = sp.cashStatus
  }
  if (isAdmin && (sp.payoutStatus === 'UNPAID' || sp.payoutStatus === 'PAID')) {
    where.payoutStatus = sp.payoutStatus
  }
  if (sp.serviceTypeId) {
    where.serviceTypeId = sp.serviceTypeId
  }
  if (sp.neighborhood) {
    where.neighborhood = { contains: sp.neighborhood, mode: 'insensitive' }
  }
  const from = parseDate(sp.from)
  const to = parseDate(sp.to, true)
  if (from || to) {
    where.startTime = {}
    if (from) where.startTime.gte = from
    if (to) where.startTime.lte = to
  }

  // Data fetch — tolerate an empty/unreachable DB.
  let jobs: JobListItem[] = []
  let employeeOptions: FilterOption[] = []
  let serviceOptions: FilterOption[] = []
  let neighborhoods: string[] = []

  try {
    const settings = await getSettings()
    neighborhoods = settings.neighborhoods ?? []

    const [rows, services, employees] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { startTime: 'desc' },
        include: {
          serviceType: { select: { name: true, color: true } },
          customer: { select: { name: true } },
          employee: { select: { name: true } },
        },
      }),
      prisma.serviceType.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, color: true },
      }),
      isAdmin
        ? prisma.user.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    jobs = rows.map((j) => ({
      id: j.id,
      title: j.title,
      startTime: j.startTime,
      priceCents: j.priceCents,
      status: j.status,
      cashStatus: j.cashStatus,
      payoutStatus: j.payoutStatus,
      service: { name: j.serviceType.name, color: j.serviceType.color },
      customerName: j.customer?.name ?? null,
      employeeName: j.employee?.name ?? null,
      neighborhood: j.neighborhood,
    }))

    serviceOptions = services.map((s) => ({
      value: s.id,
      label: s.name,
      color: s.color,
    }))
    employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }))
  } catch (error) {
    console.error('jobs page load failed', error)
  }

  const hasFilters = Boolean(
    sp.employee ||
      sp.status ||
      sp.cashStatus ||
      sp.payoutStatus ||
      sp.serviceTypeId ||
      sp.neighborhood ||
      sp.from ||
      sp.to
  )

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {isAdmin ? 'Jobs' : 'My jobs'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? 'Every job across the team.'
              : 'Jobs assigned to you.'}
          </p>
        </div>
        {isAdmin && (
          <Button render={<Link href="/jobs/new" />} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            New job
          </Button>
        )}
      </div>

      <JobsFilterBar
        isAdmin={isAdmin}
        employees={employeeOptions}
        services={serviceOptions}
        neighborhoods={neighborhoods}
      />

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-medium">
            {hasFilters ? 'No jobs match these filters' : 'No jobs yet'}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasFilters
              ? 'Try clearing a filter to see more jobs.'
              : isAdmin
                ? 'Create your first job to start scheduling the team.'
                : 'Jobs assigned to you will show up here.'}
          </p>
          {isAdmin && !hasFilters && (
            <Button render={<Link href="/jobs/new" />} className="mt-6">
              <Plus className="h-4 w-4" />
              New job
            </Button>
          )}
        </div>
      ) : (
        <JobsList jobs={jobs} isAdmin={isAdmin} />
      )}
    </div>
  )
}
