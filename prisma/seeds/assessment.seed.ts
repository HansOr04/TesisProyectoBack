import { Prisma, PrismaClient } from '@prisma/client';
import {
  ORGANIZATIONAL_TOOL_TEMPLATE,
  CAPACITY_TOOL_TEMPLATE,
  RISK_TOOL_TEMPLATE,
  AssessmentSeedTemplate,
} from '../../src/modules/assessment-core/domain/tool-templates';

let prisma: PrismaClient;

// ==========================================
// F2-B02 — Modules, permissions, system roles
// ==========================================

const ASSESSMENT_MODULES = [
  { code: 'assessment-core', name: 'Assessment Core' },
  { code: 'organizational-tool', name: 'Assessment Organizational' },
  { code: 'capacity-tool', name: 'Assessment Capacity' },
  { code: 'risk-tool', name: 'Assessment Risk' },
] as const;

const ASSESSMENT_PERMISSIONS = [
  { code: 'read', name: 'Read' },
  { code: 'write', name: 'Write' },
  { code: 'delete', name: 'Delete' },
  { code: 'admin', name: 'Admin' },
] as const;

const ASSESSMENT_ROLE_DEFS: Record<
  string,
  { name: string; description: string; permissions: string[] }
> = {
  assessment_admin: {
    name: 'Assessment Administrator',
    description:
      'Administra estructura, roles y datos de las 3 herramientas Assessment (Organizativa, Capacidades, Riesgos).',
    permissions: ASSESSMENT_MODULES.flatMap((m) =>
      ASSESSMENT_PERMISSIONS.map((p) => `${m.code}:${p.code}`),
    ),
  },
  assessment_evaluator: {
    name: 'Assessment Evaluator',
    description:
      'Evalúa organizaciones con las 3 herramientas Assessment (lectura y escritura, sin administración de estructura).',
    permissions: ASSESSMENT_MODULES.flatMap((m) =>
      ['read', 'write'].map((p) => `${m.code}:${p}`),
    ),
  },
};

async function seedAssessmentModulesAndPermissions(): Promise<
  Map<string, string>
> {
  console.log('Seeding Assessment modules and permissions...');

  const permissionIds = new Map<string, string>();

  for (const mod of ASSESSMENT_MODULES) {
    const module = await prisma.appModule.upsert({
      where: { code: mod.code },
      update: { name: mod.name, isActive: true },
      create: { code: mod.code, name: mod.name, isActive: true },
    });

    for (const perm of ASSESSMENT_PERMISSIONS) {
      const permission = await prisma.appModulePermission.upsert({
        where: { moduleId_code: { moduleId: module.id, code: perm.code } },
        update: { name: perm.name },
        create: { moduleId: module.id, code: perm.code, name: perm.name },
      });
      permissionIds.set(`${mod.code}:${perm.code}`, permission.id);
    }
  }

  console.log(
    `  Seeded ${ASSESSMENT_MODULES.length} modules, ${permissionIds.size} permissions`,
  );
  return permissionIds;
}

async function seedAssessmentRoles(
  permissionIds: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('Seeding Assessment system roles...');

  const roleIds = new Map<string, string>();

  for (const [code, def] of Object.entries(ASSESSMENT_ROLE_DEFS)) {
    let role = await prisma.authRole.findFirst({
      where: { organisation: null, code },
    });

    if (!role) {
      role = await prisma.authRole.create({
        data: {
          organisation: null,
          code,
          name: def.name,
          description: def.description,
          isSystem: true,
        },
      });
      console.log(`  Created Assessment role: ${code}`);
    } else {
      role = await prisma.authRole.update({
        where: { id: role.id },
        data: { name: def.name, description: def.description },
      });
      console.log(`  Assessment role exists (updated): ${code}`);
    }

    roleIds.set(code, role.id);

    // Rebuild permission set every run so a template change (adding a module/perm)
    // is reflected without leaving stale grants behind — safe because these are
    // system role templates, not org-specific customisations.
    await prisma.authRolePermission.deleteMany({ where: { roleId: role.id } });

    const permIds = def.permissions
      .map((key) => permissionIds.get(key))
      .filter((id): id is string => !!id);

    if (permIds.length > 0) {
      await prisma.authRolePermission.createMany({
        data: permIds.map((permissionId) => ({
          roleId: role!.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`    Assigned ${permIds.length} permissions to ${code}`);
  }

  return roleIds;
}

// ==========================================
// F1-B04 — Assessment templates (Organizativa/Capacidades/Riesgos) for the demo organisation
// ==========================================

async function seedAssessmentTemplate(
  organisation: string,
  seedTemplate: AssessmentSeedTemplate,
) {
  const template = await prisma.assessmentTemplate.upsert({
    where: {
      organisation_tool_version: {
        organisation,
        tool: seedTemplate.tool,
        version: 1,
      },
    },
    update: {
      name: seedTemplate.name,
      description: seedTemplate.description,
      labels: seedTemplate.labels ?? undefined,
      riskThreshold:
        seedTemplate.riskThreshold !== undefined
          ? new Prisma.Decimal(seedTemplate.riskThreshold)
          : undefined,
    },
    create: {
      organisation,
      tool: seedTemplate.tool,
      version: 1,
      name: seedTemplate.name,
      description: seedTemplate.description,
      labels: seedTemplate.labels ?? undefined,
      riskThreshold:
        seedTemplate.riskThreshold !== undefined
          ? new Prisma.Decimal(seedTemplate.riskThreshold)
          : undefined,
    },
  });

  // Parámetros de riesgo por país (configurables luego desde administración).
  for (const [country, params] of Object.entries(
    seedTemplate.countryRiskParams ?? {},
  )) {
    await prisma.assessmentRiskCountryParam.upsert({
      where: { organisation_country: { organisation, country } },
      update: {},
      create: {
        organisation,
        country,
        riskThreshold: new Prisma.Decimal(params.riskThreshold),
      },
    });
  }

  let indicatorCount = 0;

  for (const section of seedTemplate.sections) {
    const dbSection = await prisma.assessmentSection.upsert({
      where: {
        templateId_number: { templateId: template.id, number: section.number },
      },
      update: {
        name: section.name,
        description: section.description,
        weight: new Prisma.Decimal(section.weight),
      },
      create: {
        templateId: template.id,
        number: section.number,
        name: section.name,
        description: section.description,
        weight: new Prisma.Decimal(section.weight),
        sortOrder: section.number,
      },
    });

    for (const [index, indicator] of section.indicators.entries()) {
      await prisma.assessmentIndicator.upsert({
        where: {
          sectionId_code: { sectionId: dbSection.id, code: indicator.code },
        },
        update: {
          name: indicator.name,
          description: indicator.description,
          helpText: indicator.helpText,
          scoringRubric: indicator.scoringRubric,
          weight: new Prisma.Decimal(indicator.weight),
        },
        create: {
          sectionId: dbSection.id,
          code: indicator.code,
          name: indicator.name,
          description: indicator.description,
          helpText: indicator.helpText,
          scoringRubric: indicator.scoringRubric,
          weight: new Prisma.Decimal(indicator.weight),
          sortOrder: index,
        },
      });
      indicatorCount++;
    }
  }

  console.log(
    `  Seeded Assessment template ${seedTemplate.tool} for "${organisation}": ${seedTemplate.sections.length} sections, ${indicatorCount} KPI`,
  );
}

async function seedAssessmentTemplates(organisation: string) {
  console.log(
    `Seeding Assessment templates for organisation "${organisation}"...`,
  );

  const organisationExists = await prisma.organisation.findUnique({
    where: { id: organisation },
  });
  if (!organisationExists) {
    console.log(
      `  Skipping Assessment templates: organisation "${organisation}" does not exist. Run the identity seed first.`,
    );
    return;
  }

  for (const seedTemplate of [
    ORGANIZATIONAL_TOOL_TEMPLATE,
    CAPACITY_TOOL_TEMPLATE,
    RISK_TOOL_TEMPLATE,
  ]) {
    await seedAssessmentTemplate(organisation, seedTemplate);
  }
}

// ==========================================
// Main
// ==========================================

export interface AssessmentSeedOptions {
  organisation: string;
  /** userId → roleCode a asignar en la organización (p.ej. admin/evaluador demo). */
  roleAssignments?: Record<string, string>;
}

export async function seedAssessment(
  client: PrismaClient,
  options: AssessmentSeedOptions,
) {
  prisma = client;
  console.log('Starting Assessment seed...\n');

  const permissionIds = await seedAssessmentModulesAndPermissions();
  const roleIds = await seedAssessmentRoles(permissionIds);
  await seedAssessmentTemplates(options.organisation);

  for (const [userId, roleCode] of Object.entries(
    options.roleAssignments ?? {},
  )) {
    const roleId = roleIds.get(roleCode);
    if (!roleId) continue;
    await prisma.authUserRole.upsert({
      where: {
        organisation_userId_roleId: {
          organisation: options.organisation,
          userId,
          roleId,
        },
      },
      update: { deletedAt: null },
      create: { organisation: options.organisation, userId, roleId },
    });
    console.log(
      `  Assigned ${roleCode} to user ${userId} in "${options.organisation}"`,
    );
  }

  console.log('\nAssessment seed completed successfully!');
}
