import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/** Turn arbitrary text into a valid username seed (a-z, 0-9, underscore). */
function usernameSeed(input: string): string {
  const base = input.toLowerCase().replace(/[^a-z0-9_.]/g, '').replace(/^[._]+|[._]+$/g, '')
  return base.length >= 3 ? base : `user${base}`
}

/** Find a free username derived from `seed`, appending numbers on collisions. */
async function uniqueUsername(seed: string): Promise<string> {
  const base = usernameSeed(seed)
  let candidate = base
  let n = 1
  // Bounded loop — practically resolves within a couple of tries.
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base}${n++}`
  }
  return candidate
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Username and password',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username?.toLowerCase().trim()
        const password = credentials?.password
        if (!username || !password) return null

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user || !user.passwordHash || !user.active) return null

        const valid = await compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase()
        if (!email) return false

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) return existing.active

        const isFirstUser = (await prisma.user.count()) === 0
        await prisma.user.create({
          data: {
            email,
            name: user.name ?? email,
            username: await uniqueUsername(email.split('@')[0] || user.name || 'user'),
            image: user.image,
            role: isFirstUser ? 'ADMIN' : 'EMPLOYEE',
          },
        })
      }
      return true
    },
    async jwt({ token, user }) {
      // IMPORTANT: this callback runs on every server-side session read (every
      // page navigation calls requireUser/requireAdmin -> getServerSession ->
      // jwt()), not just at sign-in. Querying the database unconditionally here
      // added a full DB round trip to every single navigation, which is what
      // caused the multi-second tab-switch lag. We now only hit the database
      // at sign-in and periodically after that (every REFRESH_MS), trusting the
      // token the rest of the time.
      const REFRESH_MS = 5 * 60 * 1000 // 5 minutes

      if (user) {
        // Fresh sign-in: resolve our DB user id.
        // (For Google, `user.id` is Google's id, so fall back to an email lookup.)
        let uid: string | undefined
        if ((user as { username?: string }).username) {
          uid = user.id
        } else if (user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: { id: true },
          })
          uid = dbUser?.id
        }

        if (uid) {
          const dbUser = await prisma.user.findUnique({ where: { id: uid } })
          if (dbUser) {
            token.uid = dbUser.id
            token.username = dbUser.username
            token.role = dbUser.role
            token.active = dbUser.active
            token.name = dbUser.name
            token.email = dbUser.email
            token.picture = dbUser.image ?? token.picture
            token.refreshedAt = Date.now()
          }
        }
        return token
      }

      // Subsequent reads: only re-check the database periodically, so role
      // changes / deactivation still propagate within a few minutes without
      // paying a DB query on every navigation.
      const refreshedAt = (token.refreshedAt as number | undefined) ?? 0
      const stale = Date.now() - refreshedAt > REFRESH_MS
      if (stale && token.uid) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.uid as string } })
        if (dbUser) {
          token.username = dbUser.username
          token.role = dbUser.role
          token.active = dbUser.active
          token.name = dbUser.name
          token.email = dbUser.email
          token.picture = dbUser.image ?? token.picture
        } else {
          token.active = false
        }
        token.refreshedAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string
        session.user.username = (token.username as string) ?? ''
        session.user.role = (token.role as 'ADMIN' | 'EMPLOYEE') ?? 'EMPLOYEE'
        session.user.active = (token.active as boolean) ?? false
      }
      return session
    },
  },
}
