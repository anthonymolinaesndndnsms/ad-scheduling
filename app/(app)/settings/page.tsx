import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { SettingsPanel, type ServiceRow } from '@/components/settings/settings-panel'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requireAdmin()

  const settings = await getSettings()
  const services = await prisma.serviceType.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { jobs: true } } },
  })

  const serviceRows: ServiceRow[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    color: s.color,
    defaultPriceCents: s.defaultPriceCents,
    defaultDurationMins: s.defaultDurationMins,
    active: s.active,
    jobCount: s._count.jobs,
  }))

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your business, splits, scheduling, and services.
        </p>
      </div>
      <SettingsPanel
        settings={{
          businessName: settings.businessName,
          logoUrl: settings.logoUrl ?? '',
          currency: settings.currency,
          timezone: settings.timezone,
          employeeSplitPercent: settings.employeeSplitPercent,
          defaultJobDurationMins: settings.defaultJobDurationMins,
          defaultBufferMins: settings.defaultBufferMins,
          neighborhoods: settings.neighborhoods,
        }}
        services={serviceRows}
      />
    </div>
  )
}
