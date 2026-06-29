import { PrismaClient } from '@prisma/client'

const globalForPrisma = (typeof global !== 'undefined' ? global : {}) as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production' && typeof globalForPrisma !== 'undefined') {
  globalForPrisma.prisma = prisma
}
