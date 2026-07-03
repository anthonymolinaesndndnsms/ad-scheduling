import { prisma } from '@/lib/prisma'

export const DEFAULT_SERVICES = [
  { name: 'Trash Can Cleaning', color: '#10b981', defaultPriceCents: 1500, defaultDurationMins: 30 },
  { name: 'Car Wash', color: '#3b82f6', defaultPriceCents: 2500, defaultDurationMins: 45 },
  { name: 'Exterior Detail', color: '#6366f1', defaultPriceCents: 6000, defaultDurationMins: 90 },
  { name: 'Lawn Mowing', color: '#22c55e', defaultPriceCents: 4000, defaultDurationMins: 60 },
  { name: 'Weed Pulling', color: '#84cc16', defaultPriceCents: 3000, defaultDurationMins: 60 },
  { name: 'Mulch Spreading', color: '#f59e0b', defaultPriceCents: 5000, defaultDurationMins: 90 },
  { name: 'Pressure Washing', color: '#06b6d4', defaultPriceCents: 8000, defaultDurationMins: 120 },
  { name: 'Custom Job', color: '#a855f7', defaultPriceCents: null, defaultDurationMins: 60 },
] as const

/**
 * Fetch the singleton business settings row, creating it (and the default
 * service types) on first use so a fresh database self-seeds.
 */
export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })

  const serviceCount = await prisma.serviceType.count()
  if (serviceCount === 0) {
    await prisma.serviceType.createMany({
      data: DEFAULT_SERVICES.map((s) => ({
        name: s.name,
        color: s.color,
        defaultPriceCents: s.defaultPriceCents,
        defaultDurationMins: s.defaultDurationMins,
      })),
    })
  }

  return settings
}
