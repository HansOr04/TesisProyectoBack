import { PrismaClient } from '@prisma/client';
import { seedIdentity } from './seeds/identity.seed';

// `npm run prisma:seed` — idempotente: se puede correr N veces.
const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedIdentity(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
