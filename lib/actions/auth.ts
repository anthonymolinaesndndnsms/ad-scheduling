'use server'

import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyAdmins } from '@/lib/notify'

const signUpSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignUpResult = { ok: true } | { ok: false; error: string }

/**
 * Open signup for the team. The very first account ever created becomes the
 * owner (ADMIN); everyone after that joins as an EMPLOYEE.
 */
export async function signUp(input: {
  name: string
  email: string
  phone?: string
  password: string
}): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const email = parsed.data.email.toLowerCase().trim()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, error: 'An account with this email already exists' }
  }

  const isFirstUser = (await prisma.user.count()) === 0
  const passwordHash = await hash(parsed.data.password, 10)

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone?.trim() || null,
      passwordHash,
      role: isFirstUser ? 'ADMIN' : 'EMPLOYEE',
    },
  })

  if (!isFirstUser) {
    await notifyAdmins({
      type: 'employee_joined',
      title: 'New employee account',
      message: `${user.name} created an account.`,
      href: `/employees/${user.id}`,
    })
  }

  return { ok: true }
}
