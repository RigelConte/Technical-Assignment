import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log('[prisma] Connected to database');
  } catch (error) {
    console.error('[prisma] Failed to connect:', error);
    throw error;
  }
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log('[prisma] Disconnected from database');
}
