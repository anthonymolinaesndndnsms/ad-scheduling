import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      role: 'ADMIN' | 'EMPLOYEE'
      active: boolean
    } & DefaultSession['user']
  }

  interface User {
    username?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
    username?: string
    role?: 'ADMIN' | 'EMPLOYEE'
    active?: boolean
  }
}
