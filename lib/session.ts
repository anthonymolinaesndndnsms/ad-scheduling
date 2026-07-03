import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export type SessionUser = {
  id: string
  role: 'ADMIN' | 'EMPLOYEE'
  active: boolean
  name?: string | null
  email?: string | null
  image?: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user as SessionUser
}

/** Redirects to /login when signed out. Returns the signed-in user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

/** Redirects non-admins to /dashboard. Returns the signed-in admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') redirect('/dashboard')
  return user
}
