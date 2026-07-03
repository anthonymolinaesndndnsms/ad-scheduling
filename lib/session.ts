import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export type SessionUser = {
  id: string
  username: string
  role: 'ADMIN' | 'EMPLOYEE'
  active: boolean
  name?: string | null
  email?: string | null
  image?: string | null
}

// Both the (app) layout and every page call this on the same request (layout
// to gate access + render the sidebar, page to read the role). React's
// `cache()` dedupes that to a single getServerSession() call per request
// instead of decoding/verifying the session JWT twice.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user as SessionUser
})

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
