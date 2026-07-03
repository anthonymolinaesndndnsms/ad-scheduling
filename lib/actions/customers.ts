'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export type CustomerActionResult = {
  ok: boolean
  error?: string
  customerId?: string
}

async function requireAdminActor() {
  const actor = await getSessionUser()
  if (!actor || !actor.active || actor.role !== 'ADMIN') return null
  return actor
}

function invalid(error: z.ZodError): CustomerActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
}

function refreshCustomer(id?: string) {
  revalidatePath('/customers')
  if (id) revalidatePath(`/customers/${id}`)
}

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  phone: z.string().trim().max(40, 'Phone number is too long').optional(),
  address: z.string().trim().min(1, 'Address is required').max(240, 'Address is too long'),
  neighborhood: z
    .string()
    .trim()
    .min(1, 'Neighborhood is required')
    .max(120, 'Neighborhood is too long'),
  notes: z.string().trim().max(2000, 'Notes must be under 2000 characters').optional(),
})

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createCustomer(input: {
  name: string
  phone?: string
  address: string
  neighborhood: string
  notes?: string
}): Promise<CustomerActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = customerSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        address: data.address,
        neighborhood: data.neighborhood,
        notes: data.notes || null,
      },
      select: { id: true },
    })

    refreshCustomer(customer.id)
    return { ok: true, customerId: customer.id }
  } catch (error) {
    console.error('createCustomer failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Update contact fields
// ---------------------------------------------------------------------------

const updateCustomerSchema = customerSchema.extend({
  id: z.string().min(1),
})

export async function updateCustomer(input: {
  id: string
  name: string
  phone?: string
  address: string
  neighborhood: string
  notes?: string
}): Promise<CustomerActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = updateCustomerSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const existing = await prisma.customer.findUnique({
      where: { id: data.id },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Customer not found' }

    await prisma.customer.update({
      where: { id: data.id },
      data: {
        name: data.name,
        phone: data.phone || null,
        address: data.address,
        neighborhood: data.neighborhood,
        notes: data.notes || null,
      },
    })

    refreshCustomer(data.id)
    return { ok: true, customerId: data.id }
  } catch (error) {
    console.error('updateCustomer failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Update just the notes (inline editor on the profile)
// ---------------------------------------------------------------------------

const notesSchema = z.object({
  id: z.string().min(1),
  notes: z.string().trim().max(2000, 'Notes must be under 2000 characters'),
})

export async function updateCustomerNotes(input: {
  id: string
  notes: string
}): Promise<CustomerActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = notesSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const existing = await prisma.customer.findUnique({
      where: { id: parsed.data.id },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Customer not found' }

    await prisma.customer.update({
      where: { id: parsed.data.id },
      data: { notes: parsed.data.notes || null },
    })

    refreshCustomer(parsed.data.id)
    return { ok: true, customerId: parsed.data.id }
  } catch (error) {
    console.error('updateCustomerNotes failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Delete (jobs keep existing via SetNull on Job.customerId)
// ---------------------------------------------------------------------------

export async function deleteCustomer(input: {
  id: string
}): Promise<CustomerActionResult> {
  try {
    const actor = await requireAdminActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = z.string().min(1).safeParse(input.id)
    if (!parsed.success) return { ok: false, error: 'Invalid input' }

    const existing = await prisma.customer.findUnique({
      where: { id: parsed.data },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: 'Customer not found' }

    // Job.customerId has onDelete: SetNull, so job history is preserved.
    await prisma.customer.delete({ where: { id: parsed.data } })

    revalidatePath('/customers')
    return { ok: true }
  } catch (error) {
    console.error('deleteCustomer failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
