import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentAccessScopeService } from './assessment-access-scope.service';
import { AuthorizationService } from '../../identity/application/authorization.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

describe('AssessmentAccessScopeService', () => {
  let service: AssessmentAccessScopeService;
  let authorizationService: { getUserRoles: jest.Mock };
  let prisma: {
    assessmentOrganisationProfile: { findFirst: jest.Mock };
    assessmentEvaluation: { findFirst: jest.Mock };
    assessmentMitigationMeasure: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    authorizationService = { getUserRoles: jest.fn() };
    prisma = {
      assessmentOrganisationProfile: { findFirst: jest.fn() },
      assessmentEvaluation: { findFirst: jest.fn() },
      assessmentMitigationMeasure: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentAccessScopeService,
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AssessmentAccessScopeService);
  });

  it('returns an unrestricted scope for platform superadmins without querying roles', async () => {
    const scope = await service.resolveProfileScope('org1', 'user1', true);
    expect(scope).toEqual({});
    expect(authorizationService.getUserRoles).not.toHaveBeenCalled();
  });

  it('returns an unrestricted scope for assessment_admin', async () => {
    authorizationService.getUserRoles.mockResolvedValue([
      { role: { code: 'assessment_admin' } },
    ]);
    const scope = await service.resolveProfileScope('org1', 'user1', false);
    expect(scope).toEqual({});
  });

  it('restricts assessment_evaluator to their own assigned profiles', async () => {
    authorizationService.getUserRoles.mockResolvedValue([
      { role: { code: 'assessment_evaluator' } },
    ]);
    const scope = await service.resolveProfileScope('org1', 'user1', false);
    expect(scope).toEqual({ evaluatorId: 'user1' });
  });

  it('restricts a user with no Assessment role at all to their own assigned profiles', async () => {
    authorizationService.getUserRoles.mockResolvedValue([]);
    const scope = await service.resolveProfileScope('org1', 'user1', false);
    expect(scope).toEqual({ evaluatorId: 'user1' });
  });

  describe('assertInScope', () => {
    it('does not query anything for an unrestricted scope', async () => {
      await service.assertInScope('org1', {}, 'evaluation', 'ev1');
      expect(prisma.assessmentEvaluation.findFirst).not.toHaveBeenCalled();
    });

    it('lets an evaluator reach an evaluation of an assigned profile', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue({
        profile: { evaluatorId: 'user1' },
      });
      await expect(
        service.assertInScope(
          'org1',
          { evaluatorId: 'user1' },
          'evaluation',
          'ev1',
        ),
      ).resolves.toBeUndefined();
      expect(prisma.assessmentEvaluation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ev1', organisation: 'org1', deletedAt: null },
        }),
      );
    });

    it('answers 404 for a profile assigned to someone else or to nobody', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValueOnce({
        evaluatorId: 'other',
      });
      await expect(
        service.assertInScope(
          'org1',
          { evaluatorId: 'user1' },
          'profile',
          'p1',
        ),
      ).rejects.toThrow(NotFoundException);
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValueOnce({
        evaluatorId: null,
      });
      await expect(
        service.assertInScope(
          'org1',
          { evaluatorId: 'user1' },
          'profile',
          'p1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('answers 404 when the resource does not exist', async () => {
      prisma.assessmentMitigationMeasure.findFirst.mockResolvedValue(null);
      await expect(
        service.assertInScope(
          'org1',
          { evaluatorId: 'user1' },
          'mitigation-measure',
          'm1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
