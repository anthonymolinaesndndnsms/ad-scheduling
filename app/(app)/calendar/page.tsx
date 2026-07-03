import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { CalendarShell } from '@/components/calendar/calendar-shell'
import type {
  CalendarEmployee,
  CalendarJob,
  CalendarServiceType,
  CalendarView,
} from '@/components/calendar/types'
import { CALENDAR_VIEWS } from '@/components/calendar/types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  view?: string
  date?: string
  employee?: string
  service?: string
  status?: string
}>

function parseView(value: string | undefined): CalendarView {
  return CALENDAR_VIEWS.includes(value as CalendarView)
    ? (value as CalendarView)
    : 'agenda'
}

function parseAnchor(value: string | undefined): Date {
  if (value) {
    const parsed = parseISO(value)
    if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed)
  }
  return startOfDay(new Date())
}

/** Inclusive [from, to] fetch window for the selected view + anchor. */
function rangeForView(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  switch (view) {
    case 'day':
      return { from: startOfDay(anchor), to: endOfDay(anchor) }
    case 'week':
      return {
        from: startOfWeek(anchor, { weekStartsOn: 1 }),
        to: endOfWeek(anchor, { weekStartsOn: 1 }),
      }
    case 'month': {
      // include leading/trailing days shown in the month grid
      const first = startOfMonth(anchor)
      const last = endOfMonth(anchor)
      return {
        from: startOfWeek(first, { weekStartsOn: 1 }),
        to: endOfWeek(last, { weekStartsOn: 1 }),
      }
    }
    case 'agenda':
      return { from: startOfDay(anchor), to: endOfDay(addDays(anchor, 13)) }
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const params = await searchParams

  const view = parseView(params.view)
  const anchor = parseAnchor(params.date)
  const { from, to } = rangeForView(view, anchor)

  // Employees can only ever see their own jobs; the employee filter is ignored for them.
  const employeeFilter = isAdmin ? params.employee : user.id
  const serviceFilter = params.service
  const statusFilter =
    params.status === 'PENDING' || params.status === 'COMPLETED'
      ? params.status
      : undefined

  let jobs: CalendarJob[] = []
  let employees: CalendarEmployee[] = []
  let serviceTypes: CalendarServiceType[] = []

  try {
    const [jobRows, employeeRows, serviceRows] = await Promise.all([
      prisma.job.findMany({
        where: {
          startTime: { gte: from, lte: to },
          ...(employeeFilter ? { employeeId: employeeFilter } : {}),
          ...(serviceFilter ? { serviceTypeId: serviceFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { startTime: 'asc' },
        select: {
          id: true,
          title: true,
          startTime: true,
          durationMins: true,
          neighborhood: true,
          address: true,
          status: true,
          cashStatus: true,
          payoutStatus: true,
          priceCents: true,
          employeeId: true,
          serviceTypeId: true,
          employee: { select: { name: true } },
          serviceType: { select: { name: true, color: true } },
        },
      }),
      isAdmin
        ? prisma.user.findMany({
            where: { role: 'EMPLOYEE', active: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      prisma.serviceType.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, color: true },
      }),
    ])

    jobs = jobRows.map((j) => ({
      id: j.id,
      title: j.title,
      startTime: j.startTime.toISOString(),
      durationMins: j.durationMins,
      neighborhood: j.neighborhood,
      address: j.address,
      status: j.status,
      cashStatus: j.cashStatus,
      payoutStatus: j.payoutStatus,
      priceCents: j.priceCents,
      employeeId: j.employeeId,
      employeeName: j.employee?.name ?? null,
      serviceTypeId: j.serviceTypeId,
      serviceTypeName: j.serviceType.name,
      serviceColor: j.serviceType.color,
    }))
    employees = employeeRows
    serviceTypes = serviceRows
  } catch {
    // DB may be empty or unreachable — render an empty, functional calendar.
    jobs = []
    employees = []
    serviceTypes = []
  }

  return (
    <CalendarShell
      view={view}
      anchorISO={anchor.toISOString()}
      isAdmin={isAdmin}
      jobs={jobs}
      employees={employees}
      serviceTypes={serviceTypes}
      filters={{
        employee: employeeFilter && isAdmin ? employeeFilter : undefined,
        service: serviceFilter,
        status: statusFilter,
      }}
    />
  )
}
