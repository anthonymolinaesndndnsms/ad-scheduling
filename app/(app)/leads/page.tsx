import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { LeadsBoard, type LeadCardData, type ServiceOption } from '@/components/leads/leads-board'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  await requireAdmin()

  const [leads, services, settings] = await Promise.all([
    prisma.lead.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: { interestedServices: { select: { id: true, name: true } } },
    }),
    prisma.serviceType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
    getSettings(),
  ])

  const data: LeadCardData[] = leads.map((l) => ({
    id: l.id,
    address: l.address,
    neighborhood: l.neighborhood,
    name: l.name,
    phone: l.phone,
    status: l.status,
    notes: l.notes,
    followUpISO: l.followUpDate ? l.followUpDate.toISOString() : null,
    interestedServiceIds: l.interestedServices.map((s) => s.id),
    interestedServiceNames: l.interestedServices.map((s) => s.name),
  }))

  const neighborhoods = [...settings.neighborhoods].sort((a, b) => a.localeCompare(b))

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track houses you knock while you&apos;re out in the neighborhood.
        </p>
      </div>
      <LeadsBoard
        leads={data}
        services={services as ServiceOption[]}
        neighborhoods={neighborhoods}
      />
    </div>
  )
}
