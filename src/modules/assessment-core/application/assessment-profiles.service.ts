import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaginationQueryDto,
  pageArgs,
  pageResult,
} from '../../../shared/presentation/pagination';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateAssessmentProfileDto,
  UpdateAssessmentProfileDto,
} from '../presentation/dto';
import { AssessmentAuditService } from './assessment-audit.service';
import { AssessmentProfileScope } from './assessment-access-scope.service';

const ACTIVE_EVALUATION_STATUSES = ['DRAFT', 'IN_PROGRESS'] as const;

// RF-02: CRUD de organizaciones evaluadas (AssessmentOrganisationProfile).
type ToolScoreSnapshot = {
  evaluationId: string;
  status: string;
  globalScore: number | null;
};
type ToolScoresByTool = Record<
  'organizational' | 'capacity' | 'risk',
  ToolScoreSnapshot | null
>;

@Injectable()
export class AssessmentProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AssessmentAuditService,
  ) {}

  async list(
    organisation: string,
    scope: AssessmentProfileScope = {},
    query: PaginationQueryDto = new PaginationQueryDto(),
  ) {
    const where = { organisation, deletedAt: null, ...scope };
    const [items, total] = await Promise.all([
      this.prisma.assessmentOrganisationProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.assessmentOrganisationProfile.count({ where }),
    ]);
    return pageResult(query, items, total);
  }

  // RF-08: vista cross-organización para el Administrador de plataforma
  // (isSuperAdmin global). Excluye los perfiles marcados `confidential` —
  // ni siquiera el superadmin los ve aquí; la organización dueña sigue
  // viéndolos normalmente en su propio `:org/assessments/profiles`.
  async listAllForAdmin() {
    const profiles = await this.prisma.assessmentOrganisationProfile.findMany({
      where: { deletedAt: null, confidential: false },
      orderBy: { organisation: 'asc' },
    });
    const orgIds = Array.from(new Set(profiles.map((p) => p.organisation)));
    const organisations = await this.prisma.organisation.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgNameById = new Map(organisations.map((o) => [o.id, o.name]));
    return profiles.map((profile) => ({
      profile,
      organisationName:
        orgNameById.get(profile.organisation) ?? profile.organisation,
    }));
  }

  async get(
    organisation: string,
    id: string,
    scope: AssessmentProfileScope = {},
  ) {
    const profile = await this.prisma.assessmentOrganisationProfile.findFirst({
      where: { id, organisation, deletedAt: null, ...scope },
    });
    if (!profile) {
      throw new NotFoundException('Assessment organisation profile not found');
    }
    return profile;
  }

  // Una asociación Nivel 2 (associationLevel="LEVEL_2") puede agrupar empresas
  // y/o asociaciones Nivel 1 como miembros (parentProfileId). No se permite
  // anidar una Nivel 2 dentro de otra ni que un perfil sea su propio padre.
  private async validateParentProfile(
    organisation: string,
    parentProfileId: string,
    childIsLevel2: boolean,
    excludeId?: string,
  ) {
    if (parentProfileId === excludeId) {
      throw new BadRequestException('A profile cannot be its own parent');
    }
    if (childIsLevel2) {
      throw new BadRequestException(
        'A Level 2 association cannot belong to another association',
      );
    }
    const parent = await this.prisma.assessmentOrganisationProfile.findFirst({
      where: { id: parentProfileId, organisation, deletedAt: null },
    });
    if (!parent) {
      throw new NotFoundException(
        'Parent Assessment organisation profile not found',
      );
    }
    if (
      parent.type !== 'ASSOCIATION' ||
      parent.associationLevel !== 'LEVEL_2'
    ) {
      throw new BadRequestException(
        'A profile can only belong to a Level 2 association',
      );
    }
  }

  async create(
    organisation: string,
    dto: CreateAssessmentProfileDto,
    createdBy?: string,
  ) {
    // AssessmentOrganisationProfile has a hard unique index on (organisation, name)
    // that isn't scoped to deletedAt, so a previously deleted profile with
    // this exact name must be revived via upsert, not re-created, or this
    // throws a P2002 constraint violation even though the name is logically
    // free again from the user's point of view.
    const existing = await this.prisma.assessmentOrganisationProfile.findUnique(
      {
        where: { organisation_name: { organisation, name: dto.name } },
      },
    );
    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `An Assessment organisation profile named "${dto.name}" already exists`,
      );
    }

    if (dto.parentProfileId) {
      await this.validateParentProfile(
        organisation,
        dto.parentProfileId,
        dto.type === 'ASSOCIATION' && dto.associationLevel === 'LEVEL_2',
      );
    }

    try {
      const profile = await this.prisma.assessmentOrganisationProfile.upsert({
        where: { organisation_name: { organisation, name: dto.name } },
        // Prisma skips undefined fields on update, so reviving a soft-deleted
        // row via upsert would otherwise leave any optional field the caller
        // didn't set at its stale prior value instead of clearing it.
        update: {
          ...dto,
          tradeName: dto.tradeName ?? null,
          associationLevel: dto.associationLevel ?? null,
          region: dto.region ?? null,
          yearStarted: dto.yearStarted ?? null,
          memberCount: dto.memberCount ?? null,
          mainActivity: dto.mainActivity ?? null,
          secondaryProducts: dto.secondaryProducts ?? null,
          certifications: dto.certifications ?? null,
          mainMarkets: dto.mainMarkets ?? null,
          legalRep: dto.legalRep ?? null,
          contactEmail: dto.contactEmail ?? null,
          contactPhone: dto.contactPhone ?? null,
          evaluatorId: dto.evaluatorId ?? null,
          parentProfileId: dto.parentProfileId ?? null,
          deletedAt: null,
        },
        create: { organisation, ...dto },
      });
      await this.auditService.record(
        organisation,
        'assessment-profile.create',
        { profileId: profile.id, name: profile.name },
        createdBy,
      );
      return profile;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `An Assessment organisation profile named "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    organisation: string,
    id: string,
    dto: UpdateAssessmentProfileDto,
    updatedBy?: string,
  ) {
    const current = await this.get(organisation, id);

    if (dto.parentProfileId) {
      const effectiveType = dto.type ?? current.type;
      const effectiveLevel = dto.associationLevel ?? current.associationLevel;
      await this.validateParentProfile(
        organisation,
        dto.parentProfileId,
        effectiveType === 'ASSOCIATION' && effectiveLevel === 'LEVEL_2',
        id,
      );
    }

    try {
      const profile = await this.prisma.assessmentOrganisationProfile.update({
        where: { id },
        data: dto,
      });
      await this.auditService.record(
        organisation,
        'assessment-profile.update',
        { profileId: profile.id },
        updatedBy,
      );
      return profile;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `An Assessment organisation profile named "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async delete(
    organisation: string,
    id: string,
    confirm: boolean,
    deletedBy?: string,
  ) {
    const profile = await this.get(organisation, id);

    if (!confirm) {
      const activeEvaluations = await this.prisma.assessmentEvaluation.count({
        where: {
          profileId: profile.id,
          deletedAt: null,
          status: { in: [...ACTIVE_EVALUATION_STATUSES] },
        },
      });
      if (activeEvaluations > 0) {
        throw new ConflictException(
          'This profile has active evaluations. Pass ?confirm=true to delete anyway.',
        );
      }
    }

    await this.prisma.assessmentOrganisationProfile.update({
      where: { id: profile.id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record(
      organisation,
      'assessment-profile.delete',
      { profileId: profile.id, name: profile.name },
      deletedBy,
    );
  }

  private readonly hierarchyTools = [
    'ORGANIZATIONAL',
    'CAPACITY',
    'RISK',
  ] as const;

  // Último puntaje persistido (AssessmentEvaluation.globalScore) por herramienta para
  // un perfil — no se recalcula en vivo aquí para no acoplar assessment-core a los
  // servicios de cada herramienta; refleja el último resultado guardado al
  // completar la evaluación.
  private async getToolScores(organisation: string, profileId: string) {
    const byProfile = await this.getToolScoresForProfiles(organisation, [
      profileId,
    ]);
    return byProfile.get(profileId) as ToolScoresByTool;
  }

  // Una sola consulta para todos los perfiles: se trae cada evaluación (más
  // reciente primero) y se conserva la primera por (perfil, herramienta).
  private async getToolScoresForProfiles(
    organisation: string,
    profileIds: string[],
  ): Promise<Map<string, ToolScoresByTool>> {
    const empty = (): ToolScoresByTool => ({
      organizational: null,
      capacity: null,
      risk: null,
    });
    const result = new Map<string, ToolScoresByTool>(
      profileIds.map((id) => [id, empty()]),
    );
    if (profileIds.length === 0) return result;

    const evaluations = await this.prisma.assessmentEvaluation.findMany({
      where: {
        organisation,
        profileId: { in: profileIds },
        deletedAt: null,
        template: { tool: { in: [...this.hierarchyTools] } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        profileId: true,
        status: true,
        globalScore: true,
        template: { select: { tool: true } },
      },
    });

    for (const evaluation of evaluations) {
      const scores = result.get(evaluation.profileId) ?? empty();
      const key =
        evaluation.template.tool.toLowerCase() as keyof ToolScoresByTool;
      if (scores[key]) continue;
      scores[key] = {
        evaluationId: evaluation.id,
        status: evaluation.status as string,
        globalScore:
          evaluation.globalScore != null
            ? Number(evaluation.globalScore)
            : null,
      };
      result.set(evaluation.profileId, scores);
    }
    return result;
  }

  // Panel de una asociación: sus propios puntajes (se evalúa igual que
  // cualquier perfil) + las empresas/asociaciones Nivel 1 vinculadas
  // (parentProfileId) con el puntaje de cada una por herramienta.
  async getAssociationOverview(
    organisation: string,
    parentProfileId: string,
    scope: AssessmentProfileScope = {},
  ) {
    const profile = await this.get(organisation, parentProfileId, scope);
    const [ownScores, children] = await Promise.all([
      this.getToolScores(organisation, profile.id),
      this.prisma.assessmentOrganisationProfile.findMany({
        where: { organisation, parentProfileId, deletedAt: null, ...scope },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const childScores = await this.getToolScoresForProfiles(
      organisation,
      children.map((c) => c.id),
    );
    const childRows = children.map((child) => ({
      profile: child,
      ...(childScores.get(child.id) as ToolScoresByTool),
    }));

    return { profile, ownScores, children: childRows };
  }
}
