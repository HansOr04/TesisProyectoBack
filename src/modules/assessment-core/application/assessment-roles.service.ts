import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentAuditService } from './assessment-audit.service';
import { ASSESSMENT_ROLE_CODES } from '../domain/assessment.constants';

// RF-01: administrador y evaluador Assessment sobre el subsistema real de autorización
// (AuthRole/AuthUserRole) — ver doc 03 §2.0. No se crea un modelo propio de roles.
@Injectable()
export class AssessmentRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AssessmentAuditService,
  ) {}

  async listActive(organisation: string) {
    return this.prisma.authUserRole.findMany({
      where: {
        organisation,
        deletedAt: null,
        role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
      },
      include: {
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assign(
    organisation: string,
    userId: string,
    roleCode: string,
    assignedBy?: string,
  ) {
    const role = await this.prisma.authRole.findFirst({
      where: { organisation: null, code: roleCode },
    });
    if (!role) {
      throw new NotFoundException(
        `Assessment role "${roleCode}" not found. Run the Assessment seed (prisma:seed) first.`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    const existing = await this.prisma.authUserRole.findFirst({
      where: { organisation, userId, roleId: role.id, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('User already has this Assessment role');
    }

    // AuthUserRole has a unique constraint on (organisation, userId, roleId)
    // that isn't scoped to deletedAt, so a previously revoked assignment for
    // this exact role must be revived via upsert, not re-created, or this
    // throws a P2002 constraint violation.
    const userRole = await this.prisma.authUserRole.upsert({
      where: {
        organisation_userId_roleId: {
          organisation,
          userId,
          roleId: role.id,
        },
      },
      update: { deletedAt: null, assignedBy },
      create: { organisation, userId, roleId: role.id, assignedBy },
      include: { role: true },
    });

    await this.auditService.record(
      organisation,
      'assessment-role.assign',
      { userId, roleCode, userRoleId: userRole.id },
      assignedBy,
    );

    return userRole;
  }

  async revoke(
    organisation: string,
    id: string,
    confirm: boolean,
    revokedBy?: string,
  ) {
    const userRole = await this.prisma.authUserRole.findFirst({
      where: {
        id,
        organisation,
        deletedAt: null,
        role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
      },
      include: { role: true },
    });
    if (!userRole) {
      throw new NotFoundException('Assessment role assignment not found');
    }

    if (!confirm) {
      const activeEvaluations = await this.prisma.assessmentEvaluation.count({
        where: {
          organisation,
          deletedAt: null,
          status: { in: ['DRAFT', 'IN_PROGRESS'] },
          startedBy: userRole.userId,
        },
      });
      if (activeEvaluations > 0) {
        throw new ConflictException(
          'User has active Assessment evaluations. Pass ?confirm=true to revoke anyway.',
        );
      }
    }

    await this.prisma.authUserRole.update({
      where: { id: userRole.id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record(
      organisation,
      'assessment-role.revoke',
      {
        userId: userRole.userId,
        roleCode: userRole.role.code,
        userRoleId: userRole.id,
      },
      revokedBy,
    );
  }

  async history(organisation: string, userId: string) {
    const [assignments, activityLogs] = await Promise.all([
      this.prisma.authUserRole.findMany({
        where: {
          organisation,
          userId,
          role: { code: { in: [...ASSESSMENT_ROLE_CODES] } },
        },
        // El historial incluye asignaciones revocadas (deletedAt != null),
        // por eso aquí no se filtra por deletedAt.
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.findMany({
        where: {
          organisation,
          type: { in: ['assessment-role.assign', 'assessment-role.revoke'] },
          data: { path: ['userId'], equals: userId },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { assignments, activityLogs };
  }
}
