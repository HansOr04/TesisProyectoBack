import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Paginated,
  PaginationQueryDto,
  pageArgs,
  pageResult,
} from '../../../shared/presentation/pagination';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  ASSESSMENT_ROLE_CODES,
  AssessmentRoleCode,
} from '../../assessment-core/domain/assessment.constants';
import { AssessmentRolesService } from '../../assessment-core/application/assessment-roles.service';
import { PASSWORD_HASHER, PasswordHasherPort } from '../domain/ports';

export interface OrganisationUserView {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  hasPassword: boolean;
  oauthProvider: string | null;
  createdAt: Date;
  roles: { assignmentId: string; code: string; name: string }[];
}

interface Actor {
  id: string;
  isSuperAdmin: boolean;
}

// Alta y administración de usuarios de una organización. Un administrador
// de evaluación (assessment_admin) gestiona usuarios y roles de su
// organización; solo un superadmin global puede otorgar/quitar superadmin.
@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: AssessmentRolesService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async listMembers(
    organisation: string,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ): Promise<OrganisationUserView[] | Paginated<OrganisationUserView>> {
    const where = { organisationId: organisation, user: { deletedAt: null } };
    const total = await this.prisma.organisationMember.count({ where });
    const members = await this.prisma.organisationMember.findMany({
      where,
      ...pageArgs(query),
      include: {
        user: {
          include: {
            userRoles: {
              where: {
                organisation,
                deletedAt: null,
                role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
              },
              include: { role: true },
            },
          },
        },
      },
      orderBy: { user: { email: 'asc' } },
    });
    return pageResult(
      query,
      members.map((m) => this.toView(m.user)),
      total,
    );
  }

  async createMember(
    organisation: string,
    input: {
      email: string;
      name: string;
      password?: string;
      roleCode?: AssessmentRoleCode;
      isSuperAdmin?: boolean;
    },
    actor: Actor,
  ): Promise<OrganisationUserView> {
    if (input.isSuperAdmin && !actor.isSuperAdmin) {
      throw new ForbiddenException(
        'Solo un superadministrador puede otorgar superadmin',
      );
    }
    const email = input.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const alreadyMember = await this.prisma.organisationMember.findUnique({
        where: {
          organisationId_userId: {
            organisationId: organisation,
            userId: user.id,
          },
        },
      });
      if (alreadyMember) {
        throw new ConflictException(
          'Ese correo ya pertenece a esta organización',
        );
      }
      // Usuario existente en otra organización: se agrega como miembro.
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(input.password
            ? { passwordHash: await this.hasher.hash(input.password) }
            : {}),
          ...(input.isSuperAdmin !== undefined && actor.isSuperAdmin
            ? { isSuperAdmin: input.isSuperAdmin }
            : {}),
          deletedAt: null,
          isActive: true,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          name: input.name,
          passwordHash: input.password
            ? await this.hasher.hash(input.password)
            : null,
          isSuperAdmin: Boolean(input.isSuperAdmin && actor.isSuperAdmin),
        },
      });
    }
    await this.prisma.organisationMember.create({
      data: { organisationId: organisation, userId: user.id },
    });
    if (input.roleCode) {
      await this.rolesService.assign(
        organisation,
        user.id,
        input.roleCode,
        actor.id,
      );
    }
    return this.getMember(organisation, user.id);
  }

  async updateMember(
    organisation: string,
    userId: string,
    input: {
      name?: string;
      isActive?: boolean;
      password?: string;
      isSuperAdmin?: boolean;
      roleCode?: AssessmentRoleCode | null;
    },
    actor: Actor,
  ): Promise<OrganisationUserView> {
    await this.assertMember(organisation, userId);
    if (input.isSuperAdmin !== undefined && !actor.isSuperAdmin) {
      throw new ForbiddenException(
        'Solo un superadministrador puede cambiar superadmin',
      );
    }
    if (
      userId === actor.id &&
      (input.isActive === false || input.isSuperAdmin === false)
    ) {
      throw new ConflictException(
        'No puedes desactivarte ni quitarte superadmin a ti mismo',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.password
          ? { passwordHash: await this.hasher.hash(input.password) }
          : {}),
        ...(input.isSuperAdmin !== undefined
          ? { isSuperAdmin: input.isSuperAdmin }
          : {}),
      },
    });
    if (input.roleCode !== undefined) {
      await this.replaceRole(organisation, userId, input.roleCode, actor.id);
    }
    // Un usuario desactivado o con contraseña cambiada pierde sus sesiones.
    if (input.isActive === false || input.password) {
      await this.refreshTokens.revokeAllForUser(userId);
    }
    return this.getMember(organisation, userId);
  }

  async removeMember(
    organisation: string,
    userId: string,
    actor: Actor,
  ): Promise<void> {
    await this.assertMember(organisation, userId);
    if (userId === actor.id) {
      throw new ConflictException(
        'No puedes quitarte a ti mismo de la organización',
      );
    }
    await this.replaceRole(organisation, userId, null, actor.id);
    await this.refreshTokens.revokeAllForUser(userId);
    await this.prisma.organisationMember.delete({
      where: {
        organisationId_userId: { organisationId: organisation, userId },
      },
    });
  }

  private async replaceRole(
    organisation: string,
    userId: string,
    roleCode: AssessmentRoleCode | null,
    actorId: string,
  ) {
    const current = await this.prisma.authUserRole.findMany({
      where: {
        organisation,
        userId,
        deletedAt: null,
        role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
      },
      include: { role: true },
    });
    for (const assignment of current) {
      if (assignment.role.code !== roleCode) {
        await this.rolesService.revoke(
          organisation,
          assignment.id,
          true,
          actorId,
        );
      }
    }
    if (roleCode && !current.some((a) => a.role.code === roleCode)) {
      await this.rolesService.assign(organisation, userId, roleCode, actorId);
    }
  }

  private async assertMember(organisation: string, userId: string) {
    const member = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: { organisationId: organisation, userId },
      },
    });
    if (!member)
      throw new NotFoundException(
        'El usuario no pertenece a esta organización',
      );
  }

  private async getMember(
    organisation: string,
    userId: string,
  ): Promise<OrganisationUserView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        userRoles: {
          where: {
            organisation,
            deletedAt: null,
            role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
          },
          include: { role: true },
        },
      },
    });
    return this.toView(user);
  }

  private toView(user: {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
    isSuperAdmin: boolean;
    passwordHash: string | null;
    oauthProvider: string | null;
    createdAt: Date;
    userRoles: { id: string; role: { code: string; name: string } }[];
  }): OrganisationUserView {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      hasPassword: Boolean(user.passwordHash),
      oauthProvider: user.oauthProvider,
      createdAt: user.createdAt,
      roles: user.userRoles.map((r) => ({
        assignmentId: r.id,
        code: r.role.code,
        name: r.role.name,
      })),
    };
  }
}
