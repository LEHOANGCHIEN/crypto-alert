import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../src/seed/seed-demo';

const prisma = new PrismaClient();
seedDemo(prisma)
  .then(() => console.log('seed OK: demo@example.com'))
  .catch((e) => {
    console.error('seed failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
