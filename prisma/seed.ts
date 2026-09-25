import { PrismaClient } from '@prisma/client';
import { seedIdentity } from './seeds/identity.seed';
import { seedAssessment } from './seeds/assessment.seed';

// `npm run prisma:seed` — idempotente: se puede correr N veces.
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const identity = await seedIdentity(prisma);
  await seedAssessment(prisma, {
    organisation: identity.organisationId,
    roleAssignments: {
      [identity.adminUserId]: 'assessment_admin',
      [identity.evaluatorUserId]: 'assessment_evaluator',
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
