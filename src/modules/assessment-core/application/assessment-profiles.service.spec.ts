import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentProfilesService } from './assessment-profiles.service';
import { AssessmentAuditService } from './assessment-audit.service';

type AnyRecord = Record<string, any>;

function createPrismaMock() {
  return {
    assessmentOrganisationProfile: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    assessmentEvaluation: {
      count: jest.fn(),
    },
  } as AnyRecord;
}

function createAuditServiceMock() {
  return { record: jest.fn() } as AnyRecord;
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

describe('AssessmentProfilesService (F2-B04)', () => {
  let prisma: AnyRecord;
  let audit: AnyRecord;
  let service: AssessmentProfilesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditServiceMock();
    service = new AssessmentProfilesService(
      prisma as unknown as PrismaService,
      audit as unknown as AssessmentAuditService,
    );
  });

  describe('get', () => {
    it('throws NotFoundException when the profile does not exist', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue(null);
      await expect(service.get('mh', 'p1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = {
      name: 'Asociación Demo',
      type: 'ASSOCIATION' as const,
      country: 'EC',
      mainProduct: 'cacao',
    };

    it('creates the profile and records an audit log', async () => {
      prisma.assessmentOrganisationProfile.findUnique.mockResolvedValue(null);
      prisma.assessmentOrganisationProfile.upsert.mockResolvedValue({
        id: 'p1',
        ...dto,
      });

      const result = await service.create('mh', dto, 'user-1');

      expect(result.id).toBe('p1');
      expect(prisma.assessmentOrganisationProfile.upsert).toHaveBeenCalledWith({
        where: {
          organisation_name: { organisation: 'mh', name: dto.name },
        },
        update: {
          ...dto,
          tradeName: null,
          associationLevel: null,
          region: null,
          yearStarted: null,
          memberCount: null,
          mainActivity: null,
          secondaryProducts: null,
          certifications: null,
          mainMarkets: null,
          legalRep: null,
          contactEmail: null,
          contactPhone: null,
          evaluatorId: null,
          parentProfileId: null,
          deletedAt: null,
        },
        create: { organisation: 'mh', ...dto },
      });
      expect(audit.record).toHaveBeenCalledWith(
        'mh',
        'assessment-profile.create',
        expect.objectContaining({ profileId: 'p1' }),
        'user-1',
      );
    });

    it('rejects a duplicate name still in active use with ConflictException (409)', async () => {
      prisma.assessmentOrganisationProfile.findUnique.mockResolvedValue({
        id: 'existing',
        deletedAt: null,
      });

      await expect(service.create('mh', dto, 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        prisma.assessmentOrganisationProfile.upsert,
      ).not.toHaveBeenCalled();
    });

    it('revives a soft-deleted profile with the same name instead of erroring', async () => {
      prisma.assessmentOrganisationProfile.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: new Date(),
      });
      prisma.assessmentOrganisationProfile.upsert.mockResolvedValue({
        id: 'p1',
        ...dto,
        deletedAt: null,
      });

      const result = await service.create('mh', dto, 'user-1');

      expect(result.id).toBe('p1');
      expect(result.deletedAt).toBeNull();
    });

    it('clears stale optional fields left over from the soft-deleted profile on revive', async () => {
      prisma.assessmentOrganisationProfile.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: new Date(),
        region: 'Coast',
        legalRep: 'Old Rep',
        contactEmail: 'old@example.com',
        contactPhone: '+593000000',
        evaluatorId: 'evaluator-old',
      });
      prisma.assessmentOrganisationProfile.upsert.mockResolvedValue({
        id: 'p1',
        ...dto,
        deletedAt: null,
      });

      await service.create('mh', dto, 'user-1');

      expect(prisma.assessmentOrganisationProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            region: null,
            legalRep: null,
            contactEmail: null,
            contactPhone: null,
            evaluatorId: null,
          }),
        }),
      );
    });

    it('maps a duplicate-name P2002 error to ConflictException (409)', async () => {
      prisma.assessmentOrganisationProfile.findUnique.mockResolvedValue(null);
      prisma.assessmentOrganisationProfile.upsert.mockRejectedValue(p2002());

      await expect(service.create('mh', dto, 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('delete', () => {
    const profile = { id: 'p1', organisation: 'mh', name: 'Asociación Demo' };

    it('throws ConflictException when there are active evaluations and confirm=false', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue(profile);
      prisma.assessmentEvaluation.count.mockResolvedValue(1);

      await expect(
        service.delete('mh', 'p1', false, 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        prisma.assessmentOrganisationProfile.update,
      ).not.toHaveBeenCalled();
    });

    it('soft-deletes and skips the active-evaluation check when confirm=true', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue(profile);
      prisma.assessmentOrganisationProfile.update.mockResolvedValue({
        ...profile,
        deletedAt: new Date(),
      });

      await service.delete('mh', 'p1', true, 'user-1');

      expect(prisma.assessmentEvaluation.count).not.toHaveBeenCalled();
      expect(prisma.assessmentOrganisationProfile.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(audit.record).toHaveBeenCalledWith(
        'mh',
        'assessment-profile.delete',
        expect.objectContaining({ profileId: 'p1' }),
        'user-1',
      );
    });
  });
});
