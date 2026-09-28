import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentApplicabilityService } from './assessment-applicability.service';
import { AssessmentAuditService } from './assessment-audit.service';

type AnyRecord = Record<string, any>;

function createPrismaMock() {
  return {
    assessmentOrganisationProfile: {
      findFirst: jest.fn(),
    },
    assessmentProfileSectionExclusion: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    assessmentProfileIndicatorExclusion: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    assessmentSection: { findMany: jest.fn().mockResolvedValue([]) },
    assessmentIndicator: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  } as AnyRecord;
}

function createAuditServiceMock() {
  return { record: jest.fn() } as AnyRecord;
}

describe('AssessmentApplicabilityService', () => {
  let prisma: AnyRecord;
  let audit: AnyRecord;
  let service: AssessmentApplicabilityService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditServiceMock();
    service = new AssessmentApplicabilityService(
      prisma as unknown as PrismaService,
      audit as unknown as AssessmentAuditService,
    );
  });

  describe('get', () => {
    it('throws NotFoundException when the profile does not exist', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue(null);
      await expect(service.get('mh', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the excluded section and indicator ids for the profile', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue({
        id: 'profile-1',
      });
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([
        { sectionId: 'sec-1' },
      ]);
      prisma.assessmentProfileIndicatorExclusion.findMany.mockResolvedValue([
        { indicatorId: 'ind-1' },
        { indicatorId: 'ind-2' },
      ]);

      const result = await service.get('mh', 'profile-1');

      expect(result).toEqual({
        excludedSectionIds: ['sec-1'],
        excludedIndicatorIds: ['ind-1', 'ind-2'],
      });
    });
  });

  describe('set', () => {
    it('replaces the exclusion set inside a single transaction and records an audit entry', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue({
        id: 'profile-1',
      });
      prisma.$transaction.mockResolvedValue([]);

      const result = await service.set(
        'mh',
        'profile-1',
        { excludedSectionIds: ['sec-1'], excludedIndicatorIds: ['ind-1'] },
        'user-1',
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        excludedSectionIds: ['sec-1'],
        excludedIndicatorIds: ['ind-1'],
      });
      expect(audit.record).toHaveBeenCalledWith(
        'mh',
        'assessment-profile.applicability-update',
        expect.objectContaining({
          profileId: 'profile-1',
          excludedSectionCount: 1,
          excludedIndicatorCount: 1,
        }),
        'user-1',
      );
    });

    it('throws NotFoundException when the profile does not exist', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.set('mh', 'missing', {
          excludedSectionIds: [],
          excludedIndicatorIds: [],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // Las exclusiones se guardan por id, pero cada versión de plantilla tiene
  // ids nuevos: se resuelven por código (KPI) y por número (sección) para que
  // sigan valiendo en las evaluaciones que corren sobre versiones anteriores.
  describe('resolución entre versiones de plantilla', () => {
    const scope = { organisation: 'mh', tool: 'ORGANIZATIONAL' };

    it('expande un KPI excluido a su equivalente en las demás versiones', async () => {
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([]);
      prisma.assessmentProfileIndicatorExclusion.findMany.mockResolvedValue([
        {
          profileId: 'profile-1',
          indicator: { code: 'KPI 1.1', section: { template: scope } },
        },
      ]);
      prisma.assessmentIndicator.findMany.mockResolvedValue([
        { id: 'v1-ind', code: 'KPI 1.1', section: { template: scope } },
        { id: 'v2-ind', code: 'KPI 1.1', section: { template: scope } },
      ]);

      const result = await service.resolveExcludedIndicatorIds('profile-1');

      expect(result).toEqual(new Set(['v1-ind', 'v2-ind']));
    });

    it('no se pasa a otra herramienta con el mismo código de KPI', async () => {
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([]);
      prisma.assessmentProfileIndicatorExclusion.findMany.mockResolvedValue([
        {
          profileId: 'profile-1',
          indicator: { code: 'KPI 1.1', section: { template: scope } },
        },
      ]);
      // La consulta acota por organización y herramienta; Riesgos usa los
      // mismos códigos y no debe entrar.
      prisma.assessmentIndicator.findMany.mockResolvedValue([
        { id: 'org-ind', code: 'KPI 1.1', section: { template: scope } },
        {
          id: 'risk-ind',
          code: 'KPI 1.1',
          section: { template: { organisation: 'mh', tool: 'RISK' } },
        },
      ]);

      const result = await service.resolveExcludedIndicatorIds('profile-1');

      expect(result).toEqual(new Set(['org-ind']));
      const where = prisma.assessmentIndicator.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        {
          section: {
            is: { template: { is: { ...scope, deletedAt: null } } },
          },
        },
      ]);
    });

    it('excluir una sección arrastra sus KPI en todas las versiones', async () => {
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([
        { profileId: 'profile-1', section: { number: 2, template: scope } },
      ]);
      prisma.assessmentProfileIndicatorExclusion.findMany.mockResolvedValue([]);
      prisma.assessmentSection.findMany.mockResolvedValue([
        {
          id: 'v1-sec',
          number: 2,
          template: scope,
          indicators: [{ id: 'v1-a' }, { id: 'v1-b' }],
        },
        {
          id: 'v2-sec',
          number: 2,
          template: scope,
          indicators: [{ id: 'v2-a' }],
        },
        {
          id: 'otra-sec',
          number: 3,
          template: scope,
          indicators: [{ id: 'no' }],
        },
      ]);

      expect(await service.resolveExcludedSectionIds('profile-1')).toEqual(
        new Set(['v1-sec', 'v2-sec']),
      );
      expect(await service.resolveExcludedIndicatorIds('profile-1')).toEqual(
        new Set(['v1-a', 'v1-b', 'v2-a']),
      );
    });

    it('sin exclusiones guardadas no consulta plantillas', async () => {
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([]);
      prisma.assessmentProfileIndicatorExclusion.findMany.mockResolvedValue([]);

      expect(await service.resolveExcludedIndicatorIds('profile-1')).toEqual(
        new Set(),
      );
      expect(prisma.assessmentIndicator.findMany).not.toHaveBeenCalled();
      expect(prisma.assessmentSection.findMany).not.toHaveBeenCalled();
    });
  });
});
