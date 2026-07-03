import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { CustomersList } from '@/components/customers/customers-list'
import type { CustomerCardData } from '@/components/customers/customer-card'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; neighborhood?: string }>
}) {
  await requireAdmin()
  const { q, neighborhood } = await searchParams
  const query = (q ?? '').trim()
  const selectedNeighborhood = (neighborhood ?? '').trim()

  const settings = await getSettings()
  const neighborhoods = [...settings.neighborhoods].sort((a, b) => a.localeCompare(b))

  const where: Prisma.CustomerWhereInput = {}
  if (selectedNeighborhood) where.neighborhood = selectedNeighborhood
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
      { address: { contains: query, mode: 'insensitive' } },
    ]
  }

  let customers: CustomerCardData[] = []
  try {
    const rows = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        jobs: {
          select: {
            priceCents: true,
            status: true,
            cashStatus: true,
            startTime: true,
          },
        },
      },
    })

    customers = rows.map((c) => {
      const completed = c.jobs.filter((j) => j.status === 'COMPLETED')
      const totalSpentCents = completed.reduce((sum, j) => sum + j.priceCents, 0)
      const outstandingCents = completed
        .filter((j) => j.cashStatus === 'OUTSTANDING')
        .reduce((sum, j) => sum + j.priceCents, 0)
      const lastService = completed
        .map((j) => j.startTime)
        .sort((a, b) => b.getTime() - a.getTime())[0]

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        neighborhood: c.neighborhood,
        totalSpentCents,
        jobCount: c.jobs.length,
        lastServiceISO: lastService ? lastService.toISOString() : null,
        outstandingCents,
      }
    })
  } catch (error) {
    console.error('Failed to load customers', error)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your customer roster and their service history.
          </p>
        </div>
      </div>

      <CustomersList
        customers={customers}
        neighborhoods={neighborhoods}
        initialQuery={query}
        initialNeighborhood={selectedNeighborhood}
      />
    </div>
  )
}
