'use server'

import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyAdmins } from '@/lib/notify'

const signUpSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-z0-9_.]+$/, 'Use only letters, numbers, underscores, and periods'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignUpResult = { ok: true } | { ok: false; error: string }

/**
 * Open signup for the team. Username is the login identity; email and phone are
 * optional. The very first account ever created becomes the owner (ADMIN);
 * everyone after that joins as an EMPLOYEE.
 */
export async function signUp(input: {
  name: string
  username: string
  email?: string
  phone?: string
  password: string
}): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { name, username, password } = parsed.data
  const email = parsed.data.email ? parsed.data.email.toLowerCase().trim() : null

  const usernameTaken = await prisma.user.findUnique({ where: { username } })
  if (usernameTaken) {
    return { ok: false, error: 'That username is already taken' }
  }

  if (email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } })
    if (emailTaken) {
      return { ok: false, error: 'An account with this email already exists' }
    }
  }

  const isFirstUser = (await prisma.user.count()) === 0
  const passwordHash = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      username,
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
      message: `${user.name} (@${user.username}) created an account.`,
      href: `/employees/${user.id}`,
    })
  }

  return { ok: true }
}
