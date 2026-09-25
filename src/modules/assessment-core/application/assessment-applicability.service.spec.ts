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

  describe('resolveExcludedIndicatorIds', () => {
    it('expands section exclusions into their indicator ids and merges with direct indicator exclusions', async () => {
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([
        {
          section: {
            indicators: [{ id: 'ind-1' }, { id: 'ind-2' }],
          },
        },
      ]);
      prisma.assessmentProfileIndicatorExclusion.findMany.mockResolvedValue([
        { indicatorId: 'ind-3' },
      ]);

      const result = await service.resolveExcludedIndicatorIds('profile-1');

      expect(result).toEqual(new Set(['ind-1', 'ind-2', 'ind-3']));
    });
  });

  describe('resolveExcludedSectionIds', () => {
    it('returns a set of excluded section ids', async () => {
      prisma.assessmentProfileSectionExclusion.findMany.mockResolvedValue([
        { sectionId: 'sec-1' },
        { sectionId: 'sec-2' },
      ]);

      const result = await service.resolveExcludedSectionIds('profile-1');

      expect(result).toEqual(new Set(['sec-1', 'sec-2']));
    });
  });
});
