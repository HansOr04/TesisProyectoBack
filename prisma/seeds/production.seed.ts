import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createInterface } from 'readline';
import { seedAssessment } from './assessment.seed';

// `npm run prisma:seed:prod` — arranque de un entorno real: crea SOLO la
// organización y un superadministrador (con la contraseña pedida por consola
// o SEED_ADMIN_PASSWORD), más módulos/permisos/roles y plantillas. No crea
// cuentas de demostración ni contraseñas por defecto.
const prisma = new PrismaClient();

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (hidden) {
      // Oculta la contraseña mientras se escribe.
      const stdout = process.stdout as NodeJS.WriteStream & {
        _writeSilently?: boolean;
      };
      const original = stdout.write.bind(stdout);
      stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
        if (
          stdout._writeSilently &&
          typeof chunk === 'string' &&
          chunk !== '\n'
        )
          return true;
        return (original as (...args: unknown[]) => boolean)(chunk, ...rest);
      }) as typeof stdout.write;
      rl.question(question, (answer) => {
        stdout._writeSilently = false;
        stdout.write = original;
        process.stdout.write('\n');
        rl.close();
        resolve(answer);
      });
      stdout._writeSilently = true;
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function main(): Promise<void> {
  const organisationId = process.env.SEED_ORGANISATION_ID?.trim();
  const organisationName = process.env.SEED_ORGANISATION_NAME?.trim();
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!organisationId || !organisationName || !adminEmail) {
    throw new Error(
      'Define SEED_ORGANISATION_ID, SEED_ORGANISATION_NAME y SEED_ADMIN_EMAIL (sin valores por defecto en producción).',
    );
  }
  if (organisationId === 'demo' || adminEmail.endsWith('@evaluacion.local')) {
    throw new Error(
      'Los identificadores de demostración no son válidos para producción.',
    );
  }

  let password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (!password) {
    password = await ask(`Contraseña para ${adminEmail}: `, true);
    const confirm = await ask('Repite la contraseña: ', true);
    if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
  }
  if (password.length < 12) {
    throw new Error('La contraseña debe tener al menos 12 caracteres.');
  }

  const organisation = await prisma.organisation.upsert({
    where: { id: organisationId },
    update: { name: organisationName },
    create: { id: organisationId, name: organisationName },
  });
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, isSuperAdmin: true, isActive: true },
    create: {
      email: adminEmail,
      name: process.env.SEED_ADMIN_NAME?.trim() || 'Administrador',
      passwordHash,
      isSuperAdmin: true,
    },
  });
  await prisma.organisationMember.upsert({
    where: {
      organisationId_userId: {
        organisationId: organisation.id,
        userId: admin.id,
      },
    },
    update: {},
    create: { organisationId: organisation.id, userId: admin.id },
  });

  await seedAssessment(prisma, {
    organisation: organisation.id,
    roleAssignments: { [admin.id]: 'assessment_admin' },
  });
  console.log(
    `\nListo: organización "${organisation.id}" y superadmin ${adminEmail}.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
