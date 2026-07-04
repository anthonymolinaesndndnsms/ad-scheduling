'use server'

import { revalidatePath } from 'next/cache'
import { compare, hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export type AccountActionResult = { ok: boolean; error?: string }

function invalid(error: z.ZodError): AccountActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input' }
}

// ---------------------------------------------------------------------------
// Edit your own name / email (phone already has its own editor/action)
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
})

export async function updateMyProfile(input: {
  name: string
  email?: string
}): Promise<AccountActionResult> {
  try {
    const user = await requireUser()
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const email = parsed.data.email ? parsed.data.email.toLowerCase() : null

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== user.id) {
        return { ok: false, error: 'That email is already in use' }
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, email },
    })

    revalidatePath(`/employees/${user.id}`)
    revalidatePath('/employees')
    return { ok: true }
  } catch (error) {
    console.error('updateMyProfile failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Change your own password (requires the current password)
// ---------------------------------------------------------------------------

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export async function changeMyPassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<AccountActionResult> {
  try {
    const user = await requireUser()
    const parsed = changePasswordSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })
    if (!dbUser?.passwordHash) {
      return {
        ok: false,
        error: 'This account signs in with Google and has no password. Ask an owner to set one for you.',
      }
    }

    const valid = await compare(parsed.data.currentPassword, dbUser.passwordHash)
    if (!valid) return { ok: false, error: 'Current password is incorrect' }

    const passwordHash = await hash(parsed.data.newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    return { ok: true }
  } catch (error) {
    console.error('changeMyPassword failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Admin: reset another employee's password (no current password needed)
// ---------------------------------------------------------------------------

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function adminResetPassword(input: {
  userId: string
  newPassword: string
}): Promise<AccountActionResult> {
  try {
    const admin = await requireUser()
    if (admin.role !== 'ADMIN') return { ok: false, error: 'Not authorized' }

    const parsed = resetPasswordSchema.safeParse(input)
    if (!parsed.success) return invalid(parsed.error)

    const passwordHash = await hash(parsed.data.newPassword, 10)
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash },
    })

    return { ok: true }
  } catch (error) {
    console.error('adminResetPassword failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
