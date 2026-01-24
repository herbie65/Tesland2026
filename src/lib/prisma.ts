import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA_CLIENT__: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  // In development, reuse the Prisma client across hot reloads
  if (!global.__PRISMA_CLIENT__) {
    global.__PRISMA_CLIENT__ = new PrismaClient()
  }
  prisma = global.__PRISMA_CLIENT__
}

export { prisma }

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Helper function to gracefully disconnect
export async function disconnectDatabase() {
  await prisma.$disconnect()
}
