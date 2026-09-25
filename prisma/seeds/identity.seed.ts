import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface SeededIdentity {
  organisationId: string;
  adminUserId: string;
  evaluatorUserId: string;
}

// Usuario técnico 'system' (autor de auditorías sin actor), organización demo
// y dos cuentas: admin (assessment_admin) y evaluador (assessment_evaluator).
export async function seedIdentity(
  prisma: PrismaClient,
): Promise<SeededIdentity> {
  const organisationId = process.env.SEED_ORGANISATION_ID || 'demo';
  const organisationName =
    process.env.SEED_ORGANISATION_NAME || 'Organización Demo';
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL || 'admin@evaluacion.local'
  ).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const evaluatorEmail = (
    process.env.SEED_EVALUATOR_EMAIL || 'evaluador@evaluacion.local'
  ).toLowerCase();
  const evaluatorPassword =
    process.env.SEED_EVALUATOR_PASSWORD || 'evaluador123';

  console.log('Seeding identity...');

  await prisma.user.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      email: 'system@evaluacion.local',
      name: 'System',
      isActive: false,
    },
  });

  const organisation = await prisma.organisation.upsert({
    where: { id: organisationId },
    update: { name: organisationName },
    create: { id: organisationId, name: organisationName },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: await bcrypt.hash(adminPassword, 10),
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: 'Administrador Assessment',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      isSuperAdmin: true,
    },
  });

  const evaluator = await prisma.user.upsert({
    where: { email: evaluatorEmail },
    update: {
      passwordHash: await bcrypt.hash(evaluatorPassword, 10),
      isActive: true,
    },
    create: {
      email: evaluatorEmail,
      name: 'Evaluador Assessment',
      passwordHash: await bcrypt.hash(evaluatorPassword, 10),
    },
  });

  for (const userId of [admin.id, evaluator.id]) {
    await prisma.organisationMember.upsert({
      where: {
        organisationId_userId: { organisationId: organisation.id, userId },
      },
      update: {},
      create: { organisationId: organisation.id, userId },
    });
  }

  console.log(
    `  Organisation "${organisation.id}", users: ${adminEmail} (superadmin), ${evaluatorEmail}`,
  );

  return {
    organisationId: organisation.id,
    adminUserId: admin.id,
    evaluatorUserId: evaluator.id,
  };
}
