'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { LeadStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export type LeadActionResult = {
  ok: boolean
  error?: string
  leadId?: string
}

export type ConvertLeadResult = {
  ok: boolean
  error?: string
  /** Where the caller should redirect after a successful conversion. */
  redirectTo?: string
  customerId?: string
  leadId?: string
}

const LEAD_STATUSES = [
  'NOT_HOME',
  'INTERESTED',
  'FOLLOW_UP',
  'BOOKED',
  'NOT_INTERESTED',
] as const satisfies readonly LeadStatus[]

async function requireAdminActor() {
  const actor = await getSessionUser()
  if (!actor || !actor.active || actor.role !== 'ADMIN') return null
  return actor
}

function invalid(error: z.ZodError): LeadActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
}

function refreshLead(id?: string) {
  revalidatePath('/leads')
  if (id) revalidatePath(`/leads/${id}`)
}

/** Accept a "YYYY-MM-DD" string (from a date input) or empty → null. */
const followUpSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: 'Follow-up date must be a valid date',
  })

function parseFollowUp(value: string | null): Date | null {
  if (!value) return null
  // Anchor to local noon so the calendar day is stable across timezones.
  return new Date(`${value}T12:00:00`)
}

const leadFields = {
  address: z.string().trim().min(1, 'Address is required').max(240, 'Address is too long'),
  neighborhood: z
    .string()
    .trim()
    .min(1, 'Neighborhood is required')
    .max(120, 'Neighborhood is too long'),
  name: z.string().trim().max(120, 'Name is too long').optional(),
  phone: z.string().trim().max(40, 'Phone number is too long').optional(),
  status: z.enum(LEAD_STATUSES),
  notes: z.string().trim().max(2000, 'Notes must be under 2000 characters').optional(),
  followUpDate: followUpSchema,
  interestedServiceIds: z.array(z.string().min(1)).optional(),
}

const createLeadSchema = z.object(leadFields)
const updateLeadSchema = z.object({ id: z.string().min(1), ...leadFields })

export type LeadInput = {
  address: string
  neighborhood: string
  name?: string
  phone?: string
  status: LeadStatus
  notes?: string
  followUpDate?: string
  interestedServiceIds?: string[]
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createLead(input: LeadInput): Promise<LeadActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = createLeadSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const lead = await prisma.lead.create({
      data: {
        address: data.address,
        neighborhood: data.neighborhood,
        name: data.name || null,
        phone: data.phone || null,
        status: data.status,
        notes: data.notes || null,
        followUpDate: parseFollowUp(data.followUpDate),
        interestedServices: data.interestedServiceIds?.length
          ? { connect: data.interestedServiceIds.map((id) => ({ id })) }
          : undefined,
      },
      select: { id: true },
    })

    refreshLead(lead.id)
    return { ok: true, leadId: lead.id }
  } catch (error) {
    console.error('createLead failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Update (full edit)
// ---------------------------------------------------------------------------

export async function updateLead(
  input: LeadInput & { id: string }
): Promise<LeadActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = updateLeadSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const existing = await prisma.lead.findUnique({
      where: { id: data.id },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Lead not found' }

    await prisma.lead.update({
      where: { id: data.id },
      data: {
        address: data.address,
        neighborhood: data.neighborhood,
        name: data.name || null,
        phone: data.phone || null,
        status: data.status,
        notes: data.notes || null,
        followUpDate: parseFollowUp(data.followUpDate),
        interestedServices: {
          set: (data.interestedServiceIds ?? []).map((id) => ({ id })),
        },
      },
    })

    refreshLead(data.id)
    return { ok: true, leadId: data.id }
  } catch (error) {
    console.error('updateLead failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Quick status change (one-tap while door-knocking)
// ---------------------------------------------------------------------------

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(LEAD_STATUSES),
})

export async function setLeadStatus(input: {
  id: string
  status: LeadStatus
}): Promise<LeadActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = setStatusSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const existing = await prisma.lead.findUnique({
      where: { id: parsed.data.id },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Lead not found' }

    await prisma.lead.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    })

    refreshLead(parsed.data.id)
    return { ok: true, leadId: parsed.data.id }
  } catch (error) {
    console.error('setLeadStatus failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteLead(input: { id: string }): Promise<LeadActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = z.string().min(1).safeParse(input.id)
    if (!parsed.success) return { ok: false, error: 'Invalid input' }

    const existing = await prisma.lead.findUnique({
      where: { id: parsed.data },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Lead not found' }

    await prisma.lead.delete({ where: { id: parsed.data } })

    revalidatePath('/leads')
    return { ok: true }
  } catch (error) {
    console.error('deleteLead failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Convert to job: create (or reuse) a Customer from the lead, mark the lead
// BOOKED + convertedCustomerId, and hand back a /jobs/new redirect target.
// ---------------------------------------------------------------------------

export async function convertLead(input: {
  id: string
}): Promise<ConvertLeadResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = z.string().min(1).safeParse(input.id)
    if (!parsed.success) return { ok: false, error: 'Invalid input' }

    const lead = await prisma.lead.findUnique({ where: { id: parsed.data } })
    if (!lead) return { ok: false, error: 'Lead not found' }

    // Reuse the customer if this lead was already converted.
    let customerId = lead.convertedCustomerId
    if (customerId) {
      const stillExists = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      })
      if (!stillExists) customerId = null
    }

    if (!customerId) {
      const customer = await prisma.customer.create({
        data: {
          name: lead.name?.trim() || `Lead — ${lead.address}`,
          phone: lead.phone || null,
          address: lead.address,
          neighborhood: lead.neighborhood,
          notes: lead.notes || null,
        },
        select: { id: true },
      })
      customerId = customer.id
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'BOOKED', convertedCustomerId: customerId },
    })

    refreshLead(lead.id)
    revalidatePath('/customers')

    return {
      ok: true,
      customerId,
      leadId: lead.id,
      redirectTo: `/jobs/new?customerId=${customerId}&leadId=${lead.id}`,
    }
  } catch (error) {
    console.error('convertLead failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
