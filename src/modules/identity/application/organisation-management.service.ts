import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentAuditService } from '../../assessment-core/application/assessment-audit.service';
import { AssessmentRolesService } from '../../assessment-core/application/assessment-roles.service';
import {
  OrganisationProvisioningService,
  ProvisionedTemplate,
} from '../../assessment-core/application/organisation-provisioning.service';
import { PASSWORD_HASHER, PasswordHasherPort } from '../domain/ports';

export interface OrganisationView {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members: number;
  profiles: number;
  evaluations: number;
  templates: number;
}

export interface CreateOrganisationInput {
  id: string;
  name: string;
  /** Administrador inicial; si se omite, el superadmin que la crea queda como miembro. */
  adminEmail?: string;
  adminName?: string;
  adminPassword?: string;
}

/** El identificador viaja en las URLs (`/:org/assessments/...`): slug estricto. */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
/** Reservados por rutas globales existentes, para que nunca colisionen. */
const RESERVED = new Set([
  'auth',
  'assessments',
  'organisations',
  'health',
  'api',
]);

/**
 * Alta y mantenimiento de organizaciones (inquilinos) desde la API, reservado
 * al superadministrador global. Crear una organización no es insertar una
 * fila: hay que dejarla operativa (plantillas, parámetros de riesgo,
 * administrador con su rol), y eso es lo que hace `create` en una sola
 * transacción lógica.
 */
@Injectable()
export class OrganisationManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: OrganisationProvisioningService,
    private readonly rolesService: AssessmentRolesService,
    private readonly auditService: AssessmentAuditService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async list(): Promise<OrganisationView[]> {
    const rows = await this.prisma.organisation.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            members: true,
            assessmentProfiles: true,
            assessmentEvaluations: true,
            assessmentTemplates: true,
          },
        },
      },
    });
    return rows.map((o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      members: o._count.members,
      profiles: o._count.assessmentProfiles,
      evaluations: o._count.assessmentEvaluations,
      templates: o._count.assessmentTemplates,
    }));
  }

  async get(id: string): Promise<OrganisationView> {
    const found = (await this.list()).find((o) => o.id === id);
    if (!found) {
      throw new NotFoundException('Organización no encontrada');
    }
    return found;
  }

  async create(
    input: CreateOrganisationInput,
    actor: { id: string; email: string },
  ): Promise<{
    organisation: OrganisationView;
    templates: ProvisionedTemplate[];
    admin: { id: string; email: string; created: boolean };
  }> {
    const id = input.id.trim().toLowerCase();
    if (!SLUG.test(id)) {
      throw new BadRequestException(
        'El identificador debe tener entre 3 y 32 caracteres: minúsculas, números y guiones, sin empezar ni terminar en guion.',
      );
    }
    if (RESERVED.has(id)) {
      throw new BadRequestException(
        `"${id}" es un identificador reservado por la aplicación.`,
      );
    }
    const existing = await this.prisma.organisation.findUnique({
      where: { id },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una organización con id "${id}"`);
    }

    const organisation = await this.prisma.organisation.create({
      data: { id, name: input.name.trim() },
    });

    // Sin plantillas no se puede iniciar ninguna evaluación: se aprovisiona
    // antes de devolver, para que la organización nazca utilizable.
    const templates = await this.provisioning.provision(organisation.id);

    const admin = await this.attachAdmin(organisation.id, input, actor);

    await this.auditService.record(
      organisation.id,
      'organisation.create',
      {
        organisationId: organisation.id,
        name: organisation.name,
        adminEmail: admin.email,
        templates,
      },
      actor.id,
    );

    return { organisation: await this.get(organisation.id), templates, admin };
  }

  /** Datos editables del alta. El identificador no cambia: vive en las URLs. */
  async update(
    id: string,
    input: { name: string },
    actor: { id: string },
  ): Promise<OrganisationView> {
    const before = await this.prisma.organisation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!before) {
      throw new NotFoundException('Organización no encontrada');
    }
    const name = input.name.trim();
    if (name !== before.name) {
      await this.prisma.organisation.update({ where: { id }, data: { name } });
      await this.auditService.record(
        id,
        'organisation.update',
        {
          organisationId: id,
          changes: [{ field: 'name', before: before.name, after: name }],
        },
        actor.id,
      );
    }
    return this.get(id);
  }

  /**
   * Vuelve a aplicar las plantillas base sobre una organización existente
   * (útil si se creó antes de que existiera el aprovisionamiento o si una
   * plantilla se borró por error). No toca evaluaciones ni respuestas.
   */
  async reprovision(
    id: string,
    actor: { id: string },
  ): Promise<ProvisionedTemplate[]> {
    const organisation = await this.prisma.organisation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!organisation) {
      throw new NotFoundException('Organización no encontrada');
    }
    const templates = await this.provisioning.provision(id);
    await this.auditService.record(
      id,
      'organisation.reprovision',
      { organisationId: id, templates },
      actor.id,
    );
    return templates;
  }

  /** Crea o reutiliza al administrador inicial y le da el rol en la organización. */
  private async attachAdmin(
    organisation: string,
    input: CreateOrganisationInput,
    actor: { id: string; email: string },
  ): Promise<{ id: string; email: string; created: boolean }> {
    const email = (input.adminEmail ?? actor.email).trim().toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    let created = false;

    if (!user) {
      if (!input.adminPassword || input.adminPassword.length < 8) {
        throw new BadRequestException(
          'Para un administrador nuevo hace falta una contraseña de al menos 8 caracteres.',
        );
      }
      user = await this.prisma.user.create({
        data: {
          email,
          name: input.adminName?.trim() || email,
          passwordHash: await this.hasher.hash(input.adminPassword),
        },
      });
      created = true;
    } else if (input.adminPassword) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hasher.hash(input.adminPassword) },
      });
    }

    await this.prisma.organisationMember.upsert({
      where: {
        organisationId_userId: {
          organisationId: organisation,
          userId: user.id,
        },
      },
      update: {},
      create: { organisationId: organisation, userId: user.id },
    });
    await this.rolesService.assign(
      organisation,
      user.id,
      'assessment_admin',
      actor.id,
    );

    return { id: user.id, email: user.email, created };
  }
}
