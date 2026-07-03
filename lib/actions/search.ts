'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { formatMoney } from '@/lib/money'

/** A single search hit, ready to render + navigate to. */
export type SearchItem = {
  id: string
  label: string
  sublabel: string
  href: string
}

/** Results grouped by entity kind. Each group is capped at 5 items. */
export type SearchResults = {
  jobs: SearchItem[]
  customers: SearchItem[]
  employees: SearchItem[]
  leads: SearchItem[]
  services: SearchItem[]
}

const EMPTY: SearchResults = {
  jobs: [],
  customers: [],
  employees: [],
  leads: [],
  services: [],
}

const PER_GROUP = 5

// Case-insensitive "contains" helper for Postgres text search.
function contains(query: string) {
  return { contains: query, mode: 'insensitive' as const }
}

/**
 * Global search across the app.
 *
 * - ADMIN searches jobs, customers, employees, leads and service types.
 * - EMPLOYEE searches only jobs assigned to them.
 *
 * Never throws — degrades to empty results if the database is unreachable so
 * the command palette can render a graceful empty state.
 */
export async function globalSearch(query: string): Promise<SearchResults> {
  const user = await requireUser()

  const parsed = z.string().trim().max(200).safeParse(query)
  const q = parsed.success ? parsed.data : ''
  if (q.length < 1) return EMPTY

  try {
    // ---- EMPLOYEE: only their own jobs ----------------------------------
    if (user.role !== 'ADMIN') {
      const jobs = await prisma.job.findMany({
        where: {
          employeeId: user.id,
          OR: [
            { title: contains(q) },
            { address: contains(q) },
            { neighborhood: contains(q) },
          ],
        },
        orderBy: { startTime: 'desc' },
        take: PER_GROUP,
        select: {
          id: true,
          title: true,
          address: true,
          neighborhood: true,
          priceCents: true,
        },
      })

      return {
        ...EMPTY,
        jobs: jobs.map((j) => ({
          id: j.id,
          label: j.title,
          sublabel: `${j.address} · ${j.neighborhood} · ${formatMoney(j.priceCents)}`,
          href: `/jobs/${j.id}`,
        })),
      }
    }

    // ---- ADMIN: search everything in parallel ---------------------------
    const [jobs, customers, employees, leads, services] = await Promise.all([
      prisma.job.findMany({
        where: {
          OR: [
            { title: contains(q) },
            { address: contains(q) },
            { neighborhood: contains(q) },
          ],
        },
        orderBy: { startTime: 'desc' },
        take: PER_GROUP,
        select: {
          id: true,
          title: true,
          address: true,
          neighborhood: true,
          priceCents: true,
        },
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: contains(q) },
            { phone: contains(q) },
            { address: contains(q) },
          ],
        },
        orderBy: { name: 'asc' },
        take: PER_GROUP,
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          neighborhood: true,
        },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { name: contains(q) },
            { email: contains(q) },
            { phone: contains(q) },
          ],
        },
        orderBy: { name: 'asc' },
        take: PER_GROUP,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      }),
      prisma.lead.findMany({
        where: {
          OR: [
            { address: contains(q) },
            { name: contains(q) },
            { neighborhood: contains(q) },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: PER_GROUP,
        select: {
          id: true,
          address: true,
          name: true,
          neighborhood: true,
        },
      }),
      prisma.serviceType.findMany({
        where: { name: contains(q) },
        orderBy: { name: 'asc' },
        take: PER_GROUP,
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),
    ])

    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        label: j.title,
        sublabel: `${j.address} · ${j.neighborhood} · ${formatMoney(j.priceCents)}`,
        href: `/jobs/${j.id}`,
      })),
      customers: customers.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: [c.address, c.neighborhood, c.phone].filter(Boolean).join(' · '),
        href: `/customers/${c.id}`,
      })),
      employees: employees.map((e) => ({
        id: e.id,
        label: e.name,
        sublabel: [e.email, e.role === 'ADMIN' ? 'Owner' : 'Employee']
          .filter(Boolean)
          .join(' · '),
        href: `/employees/${e.id}`,
      })),
      leads: leads.map((l) => ({
        id: l.id,
        label: l.name || l.address,
        sublabel: [l.name ? l.address : null, l.neighborhood]
          .filter(Boolean)
          .join(' · '),
        href: `/leads/${l.id}`,
      })),
      services: services.map((s) => ({
        id: s.id,
        label: s.name,
        sublabel: s.description || 'Service type',
        href: `/settings/services/${s.id}`,
      })),
    }
  } catch (error) {
    console.error('globalSearch failed', error)
    return EMPTY
  }
}
