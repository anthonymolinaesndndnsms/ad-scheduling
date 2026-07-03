import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { centsToDollars } from '@/lib/money'
import {
  JobForm,
  type ServiceOption,
  type EmployeeOption,
  type CustomerOption,
  type JobFormInitial,
} from '@/components/jobs/job-form'

export const dynamic = 'force-dynamic'

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const settings = await getSettings()

  const [job, services, employees, customers] = await Promise.all([
    prisma.job.findUnique({ where: { id } }),
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
    prisma.user.findMany({
      where: { active: true, role: 'EMPLOYEE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, address: true, neighborhood: true },
    }),
  ])

  if (!job) notFound()

  const neighborhoods = [...settings.neighborhoods].sort((a, b) => a.localeCompare(b))

  const initial: JobFormInitial = {
    id: job.id,
    title: job.title,
    serviceTypeId: job.serviceTypeId,
    employeeId: job.employeeId ?? '',
    customerId: job.customerId ?? '',
    newCustomerName: '',
    newCustomerPhone: '',
    address: job.address,
    neighborhood: job.neighborhood,
    date: format(job.startTime, 'yyyy-MM-dd'),
    time: format(job.startTime, 'HH:mm'),
    durationMins: job.durationMins,
    priceDollars: String(centsToDollars(job.priceCents)),
    tipDollars: job.tipCents ? String(centsToDollars(job.tipCents)) : '',
    customerComments: job.customerComments ?? '',
    specifications: job.specifications ?? '',
    adminNotes: job.adminNotes ?? '',
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Edit job</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update this job&apos;s details.</p>
      </div>
      <JobForm
        mode="edit"
        services={services as ServiceOption[]}
        employees={employees as EmployeeOption[]}
        customers={customers as CustomerOption[]}
        neighborhoods={neighborhoods}
        initial={initial}
      />
    </div>
  )
}
