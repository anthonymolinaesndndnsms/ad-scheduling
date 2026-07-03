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
 *
 * This is called on many pages, so the steady-state path is a single plain
 * read (no write, no extra count query) — the upsert/seed only runs once,
 * the very first time the app is ever used against an empty database.
 */
export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 'singleton' } })
  if (existing) return existing

  // First-ever load against this database: bootstrap the singleton row and
  // the default service types together. Guard against two concurrent
  // requests both hitting the empty-database path at once.
  try {
    const [settings] = await Promise.all([
      prisma.settings.create({ data: { id: 'singleton' } }),
      prisma.serviceType.createMany({
        data: DEFAULT_SERVICES.map((s) => ({
          name: s.name,
          color: s.color,
          defaultPriceCents: s.defaultPriceCents,
          defaultDurationMins: s.defaultDurationMins,
        })),
        skipDuplicates: true,
      }),
    ])
    return settings
  } catch {
    // Another request won the race and created it first — just read it.
    return prisma.settings.findUniqueOrThrow({ where: { id: 'singleton' } })
  }
}
