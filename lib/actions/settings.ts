'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { getSettings } from '@/lib/settings'

export type SettingsActionResult = { ok: boolean; error?: string; id?: string }

function invalid(error: z.ZodError): SettingsActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
}

function refresh() {
  revalidatePath('/settings')
  revalidatePath('/jobs/new')
}

const settingsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  employeeSplitPercent: z.number().int().min(0).max(100),
  defaultJobDurationMins: z.number().int().min(5).max(1440),
  defaultBufferMins: z.number().int().min(0).max(240),
  neighborhoods: z.array(z.string().min(1)),
})

export async function updateSettings(
  input: z.input<typeof settingsSchema>
): Promise<SettingsActionResult> {
  try {
    await requireAdmin()
    const parsed = settingsSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const d = parsed.data

    // Dedupe neighborhoods case-insensitively, preserving first spelling.
    const seen = new Set<string>()
    const neighborhoods: string[] = []
    for (const n of d.neighborhoods.map((x) => x.trim()).filter(Boolean)) {
      const key = n.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        neighborhoods.push(n)
      }
    }

    await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: {
        businessName: d.businessName,
        logoUrl: d.logoUrl || null,
        currency: d.currency,
        timezone: d.timezone,
        employeeSplitPercent: d.employeeSplitPercent,
        defaultJobDurationMins: d.defaultJobDurationMins,
        defaultBufferMins: d.defaultBufferMins,
        neighborhoods,
      },
      create: {
        id: 'singleton',
        businessName: d.businessName,
        logoUrl: d.logoUrl || null,
        currency: d.currency,
        timezone: d.timezone,
        employeeSplitPercent: d.employeeSplitPercent,
        defaultJobDurationMins: d.defaultJobDurationMins,
        defaultBufferMins: d.defaultBufferMins,
        neighborhoods,
      },
    })

    refresh()
    return { ok: true }
  } catch (error) {
    console.error('updateSettings failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().min(1),
  defaultPriceCents: z.number().int().min(0).nullable(),
  defaultDurationMins: z.number().int().min(0).nullable(),
})

export async function createServiceType(
  input: z.input<typeof serviceSchema>
): Promise<SettingsActionResult> {
  try {
    await requireAdmin()
    const parsed = serviceSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const s = await prisma.serviceType.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        color: parsed.data.color,
        defaultPriceCents: parsed.data.defaultPriceCents,
        defaultDurationMins: parsed.data.defaultDurationMins,
      },
      select: { id: true },
    })
    refresh()
    return { ok: true, id: s.id }
  } catch (error) {
    console.error('createServiceType failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function updateServiceType(
  input: z.input<typeof serviceSchema> & { id: string }
): Promise<SettingsActionResult> {
  try {
    await requireAdmin()
    const parsed = serviceSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    await prisma.serviceType.update({
      where: { id: input.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        color: parsed.data.color,
        defaultPriceCents: parsed.data.defaultPriceCents,
        defaultDurationMins: parsed.data.defaultDurationMins,
      },
    })
    refresh()
    return { ok: true, id: input.id }
  } catch (error) {
    console.error('updateServiceType failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function setServiceActive(input: {
  id: string
  active: boolean
}): Promise<SettingsActionResult> {
  try {
    await requireAdmin()
    await prisma.serviceType.update({
      where: { id: input.id },
      data: { active: input.active },
    })
    refresh()
    return { ok: true, id: input.id }
  } catch (error) {
    console.error('setServiceActive failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function deleteServiceType(input: {
  id: string
}): Promise<SettingsActionResult> {
  try {
    await requireAdmin()
    const jobCount = await prisma.job.count({ where: { serviceTypeId: input.id } })
    if (jobCount > 0) {
      return {
        ok: false,
        error: 'This service has jobs. Deactivate it instead of deleting.',
      }
    }
    await prisma.serviceType.delete({ where: { id: input.id } })
    refresh()
    return { ok: true }
  } catch (error) {
    console.error('deleteServiceType failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// Re-export so callers can seed/read settings from one module if desired.
export { getSettings }
