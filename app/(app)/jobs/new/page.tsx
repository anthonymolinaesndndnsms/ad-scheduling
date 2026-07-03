import { format } from 'date-fns'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import {
  JobForm,
  type ServiceOption,
  type EmployeeOption,
  type CustomerOption,
  type JobFormInitial,
} from '@/components/jobs/job-form'

export const dynamic = 'force-dynamic'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{
    employeeId?: string
    customerId?: string
    date?: string
    leadId?: string
  }>
}) {
  await requireAdmin()
  const { employeeId, customerId, date, leadId } = await searchParams

  const settings = await getSettings()

  const [services, employees, customers, prefillCustomer] = await Promise.all([
    prisma.serviceType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        defaultPriceCents: true,
        defaultDurationMins: true,
      },
    }),
    // Any active team member is assignable, including the owner.
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, address: true, neighborhood: true },
    }),
    customerId
      ? prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, address: true, neighborhood: true },
        })
      : Promise.resolve(null),
  ])

  const neighborhoods = [...settings.neighborhoods].sort((a, b) => a.localeCompare(b))

  const initial: JobFormInitial = {
    title: '',
    serviceTypeId: '',
    employeeId: employeeId ?? '',
    customerId: customerId ?? '',
    newCustomerName: '',
    newCustomerPhone: '',
    address: prefillCustomer?.address ?? '',
    neighborhood: prefillCustomer?.neighborhood ?? '',
    date: date ?? format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    durationMins: settings.defaultJobDurationMins,
    priceDollars: '',
    tipDollars: '',
    customerComments: '',
    specifications: '',
    adminNotes: '',
    leadId: leadId ?? undefined,
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">New job</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule a job and assign it to a team member.
        </p>
      </div>
      <JobForm
        mode="create"
        services={services as ServiceOption[]}
        employees={employees as EmployeeOption[]}
        customers={customers as CustomerOption[]}
        neighborhoods={neighborhoods}
        initial={initial}
      />
    </div>
  )
}
