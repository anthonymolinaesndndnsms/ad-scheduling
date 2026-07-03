'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { notify } from '@/lib/notify'

export type EmployeeActionResult = { ok: boolean; error?: string }

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function refreshEmployee(userId: string) {
  revalidatePath('/employees')
  revalidatePath(`/employees/${userId}`)
}

async function getActor(): Promise<SessionUser | null> {
  const actor = await getSessionUser()
  if (!actor || !actor.active) return null
  return actor
}

function invalid(error: z.ZodError): EmployeeActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
}

// ---------------------------------------------------------------------------
// Activate / deactivate (admin only)
// ---------------------------------------------------------------------------

const setActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
})

export async function setEmployeeActive(input: {
  userId: string
  active: boolean
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = setActiveSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const { userId, active } = parsed.data

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) return { ok: false, error: 'User not found' }

    // Never let the business lock itself out.
    if (!active && target.role === 'ADMIN' && target.active) {
      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', active: true },
      })
      if (activeAdmins <= 1) {
        return { ok: false, error: 'You cannot deactivate the last active owner.' }
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { active } })

    if (userId !== actor.id) {
      await notify(userId, {
        type: 'account_status',
        title: active ? 'Account activated' : 'Account deactivated',
        message: active
          ? 'Your account has been re-activated. Welcome back!'
          : 'Your account has been deactivated by the owner.',
        href: '/dashboard',
      })
    }

    refreshEmployee(userId)
    return { ok: true }
  } catch (error) {
    console.error('setEmployeeActive failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Promote / demote (admin only)
// ---------------------------------------------------------------------------

const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
})

export async function setEmployeeRole(input: {
  userId: string
  role: 'ADMIN' | 'EMPLOYEE'
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = setRoleSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const { userId, role } = parsed.data

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) return { ok: false, error: 'User not found' }
    if (target.role === role) return { ok: true }

    // Demoting an admin: never allow removing the last active admin
    // (this covers demoting yourself when you are the last active admin).
    if (role === 'EMPLOYEE' && target.role === 'ADMIN' && target.active) {
      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', active: true },
      })
      if (activeAdmins <= 1) {
        return { ok: false, error: 'You cannot demote the last active owner.' }
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { role } })

    if (userId !== actor.id) {
      await notify(userId, {
        type: 'role_changed',
        title: role === 'ADMIN' ? 'You are now an owner' : 'Role updated',
        message:
          role === 'ADMIN'
            ? 'You have been promoted to owner and now have full access.'
            : 'Your role has been changed to employee.',
        href: '/dashboard',
      })
    }

    refreshEmployee(userId)
    return { ok: true }
  } catch (error) {
    console.error('setEmployeeRole failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Owner notes (admin only)
// ---------------------------------------------------------------------------

const notesSchema = z.object({
  userId: z.string().min(1),
  notes: z.string().max(2000, 'Notes must be under 2000 characters'),
})

export async function updateEmployeeNotes(input: {
  userId: string
  notes: string
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = notesSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { notes: parsed.data.notes.trim() || null },
    })

    refreshEmployee(parsed.data.userId)
    return { ok: true }
  } catch (error) {
    console.error('updateEmployeeNotes failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Phone (admin, or the employee themselves)
// ---------------------------------------------------------------------------

const phoneSchema = z.object({
  userId: z.string().min(1),
  phone: z.string().max(40, 'Phone number is too long'),
})

export async function updateEmployeePhone(input: {
  userId: string
  phone: string
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = phoneSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    if (actor.role !== 'ADMIN' && actor.id !== parsed.data.userId) {
      return { ok: false, error: 'Not authorized' }
    }

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { phone: parsed.data.phone.trim() || null },
    })

    refreshEmployee(parsed.data.userId)
    return { ok: true }
  } catch (error) {
    console.error('updateEmployeePhone failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Assigned services (admin only)
// ---------------------------------------------------------------------------

const servicesSchema = z.object({
  userId: z.string().min(1),
  serviceTypeIds: z.array(z.string().min(1)),
})

export async function updateEmployeeServices(input: {
  userId: string
  serviceTypeIds: string[]
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor || actor.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = servicesSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        services: { set: parsed.data.serviceTypeIds.map((id) => ({ id })) },
      },
    })

    refreshEmployee(parsed.data.userId)
    return { ok: true }
  } catch (error) {
    console.error('updateEmployeeServices failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Availability (admin, or the employee editing their OWN availability)
// ---------------------------------------------------------------------------

const availabilityFields = {
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_RE, 'Start time must be HH:mm'),
  endTime: z.string().regex(TIME_RE, 'End time must be HH:mm'),
  maxJobsPerDay: z.number().int().min(1).max(50).nullable().optional(),
  notes: z.string().max(500).optional(),
}

const addAvailabilitySchema = z.object({
  userId: z.string().min(1),
  ...availabilityFields,
})

const updateAvailabilitySchema = z.object({
  id: z.string().min(1),
  ...availabilityFields,
})

function canManageAvailability(actor: SessionUser, ownerId: string): boolean {
  return actor.role === 'ADMIN' || actor.id === ownerId
}

export async function addAvailabilityEntry(input: {
  userId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxJobsPerDay?: number | null
  notes?: string
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = addAvailabilitySchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    if (!canManageAvailability(actor, data.userId)) {
      return { ok: false, error: 'Not authorized' }
    }
    if (data.startTime >= data.endTime) {
      return { ok: false, error: 'End time must be after start time' }
    }

    const target = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    })
    if (!target) return { ok: false, error: 'User not found' }

    await prisma.availability.create({
      data: {
        userId: data.userId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        maxJobsPerDay: data.maxJobsPerDay ?? null,
        notes: data.notes?.trim() || null,
      },
    })

    refreshEmployee(data.userId)
    return { ok: true }
  } catch (error) {
    console.error('addAvailabilityEntry failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function updateAvailabilityEntry(input: {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxJobsPerDay?: number | null
  notes?: string
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const parsed = updateAvailabilitySchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)
    const data = parsed.data

    const entry = await prisma.availability.findUnique({ where: { id: data.id } })
    if (!entry) return { ok: false, error: 'Availability entry not found' }
    if (!canManageAvailability(actor, entry.userId)) {
      return { ok: false, error: 'Not authorized' }
    }
    if (data.startTime >= data.endTime) {
      return { ok: false, error: 'End time must be after start time' }
    }

    await prisma.availability.update({
      where: { id: data.id },
      data: {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        maxJobsPerDay: data.maxJobsPerDay ?? null,
        notes: data.notes?.trim() || null,
      },
    })

    refreshEmployee(entry.userId)
    return { ok: true }
  } catch (error) {
    console.error('updateAvailabilityEntry failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function deleteAvailabilityEntry(input: {
  id: string
}): Promise<EmployeeActionResult> {
  try {
    const actor = await getActor()
    if (!actor) return { ok: false, error: 'Not authorized' }

    const id = z.string().min(1).safeParse(input.id)
    if (!id.success) return { ok: false, error: 'Invalid input' }

    const entry = await prisma.availability.findUnique({ where: { id: id.data } })
    if (!entry) return { ok: false, error: 'Availability entry not found' }
    if (!canManageAvailability(actor, entry.userId)) {
      return { ok: false, error: 'Not authorized' }
    }

    await prisma.availability.delete({ where: { id: id.data } })

    refreshEmployee(entry.userId)
    return { ok: true }
  } catch (error) {
    console.error('deleteAvailabilityEntry failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
