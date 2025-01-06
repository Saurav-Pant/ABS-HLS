import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

export function createPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasourceUrl: process.env.DATABASE_URL,
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
            errorFormat: 'minimal',
    });

  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
