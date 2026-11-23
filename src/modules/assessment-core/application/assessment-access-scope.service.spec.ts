import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentAccessScopeService } from './assessment-access-scope.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

describe('AssessmentAccessScopeService', () => {
  let service: AssessmentAccessScopeService;
  let prisma: {
    authUserRole: { findMany: jest.Mock };
    assessmentOrganisationProfile: { findFirst: jest.Mock; count: jest.Mock };
    assessmentEvaluation: { findFirst: jest.Mock };
    assessmentIndicatorMeasure: { findFirst: jest.Mock };
    assessmentRisk: { findFirst: jest.Mock };
    assessmentMitigationMeasure: { findFirst: jest.Mock };
  };

  const roles = (...codes: [string, unknown?][]) =>
    prisma.authUserRole.findMany.mockResolvedValue(
      codes.map(([code, customPermissions]) => ({
        role: { code },
        customPermissions: customPermissions ?? null,
      })),
    );

  beforeEach(async () => {
    prisma = {
      authUserRole: { findMany: jest.fn().mockResolvedValue([]) },
      assessmentOrganisationProfile: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      assessmentEvaluation: { findFirst: jest.fn() },
      assessmentIndicatorMeasure: { findFirst: jest.fn() },
      assessmentRisk: { findFirst: jest.fn() },
      assessmentMitigationMeasure: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentAccessScopeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AssessmentAccessScopeService);
  });

  describe('resolveProfileScope', () => {
    it('returns an unrestricted scope for the superadmin who owns the project without querying roles', async () => {
      const scope = await service.resolveProfileScope('org1', 'user1', true);
      expect(scope).toEqual({});
      expect(prisma.authUserRole.findMany).not.toHaveBeenCalled();
    });

    it('returns an unrestricted scope for assessment_admin', async () => {
      roles(['assessment_admin']);
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        {},
      );
    });

    it('restricts assessment_evaluator to their own assigned profiles', async () => {
      roles(['assessment_evaluator']);
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        { evaluatorId: 'user1' },
      );
    });

    it('restricts a user with no Assessment role at all to their own assigned profiles', async () => {
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        { evaluatorId: 'user1' },
      );
    });

    it('shows a viewer nothing until an administrator enables organisations', async () => {
      roles(['assessment_viewer']);
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        { AND: [{ id: { in: [] } }] },
      );
    });

    it('limits a viewer to the organisations enabled for them', async () => {
      roles([
        'assessment_viewer',
        { allProfiles: false, profileIds: ['p1', 'p2'] },
      ]);
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        { AND: [{ id: { in: ['p1', 'p2'] } }] },
      );
    });

    it('lets a viewer with every organisation enabled see the whole project', async () => {
      roles(['assessment_viewer', { allProfiles: true, profileIds: [] }]);
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        {},
      );
    });

    it('reads only the active Assessment roles of this user in this project', async () => {
      await service.resolveProfileScope('org1', 'user1', false);
      expect(prisma.authUserRole.findMany).toHaveBeenCalledWith({
        where: {
          organisation: 'org1',
          userId: 'user1',
          deletedAt: null,
          role: {
            code: {
              in: [
                'assessment_admin',
                'assessment_evaluator',
                'assessment_viewer',
              ],
            },
          },
        },
        select: { customPermissions: true, role: { select: { code: true } } },
      });
    });

    it('keeps an evaluator who is also a viewer to their assigned profiles', async () => {
      roles(
        ['assessment_viewer', { allProfiles: true, profileIds: [] }],
        ['assessment_evaluator'],
      );
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        { evaluatorId: 'user1' },
      );
    });

    it('gives the broadest role when a user has several', async () => {
      roles(['assessment_viewer'], ['assessment_admin']);
      expect(await service.resolveProfileScope('org1', 'user1', false)).toEqual(
        {},
      );
    });
  });

  describe('assertInScope', () => {
    it('does not query anything for an unrestricted scope', async () => {
      await service.assertInScope('org1', {}, 'evaluation', 'ev1');
      expect(prisma.assessmentEvaluation.findFirst).not.toHaveBeenCalled();
    });

    it('lets an evaluator reach an evaluation of an assigned profile', async () => {
      prisma.assessmentEvaluation.findFirst.mockResolvedValue({
        profile: { id: 'p1' },
      });
      prisma.assessmentOrganisationProfile.count.mockResolvedValue(1);
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
      expect(prisma.assessmentOrganisationProfile.count).toHaveBeenCalledWith({
        where: {
          id: 'p1',
          organisation: 'org1',
          deletedAt: null,
          evaluatorId: 'user1',
        },
      });
    });

    it('answers 404 for a profile outside the scope', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue({
        id: 'p1',
      });
      prisma.assessmentOrganisationProfile.count.mockResolvedValue(0);
      await expect(
        service.assertInScope(
          'org1',
          { evaluatorId: 'user1' },
          'profile',
          'p1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('checks a viewer against the organisations enabled for them', async () => {
      prisma.assessmentOrganisationProfile.findFirst.mockResolvedValue({
        id: 'p9',
      });
      const scope = { AND: [{ id: { in: ['p1'] } }] };
      await expect(
        service.assertInScope('org1', scope, 'profile', 'p9'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.assessmentOrganisationProfile.count).toHaveBeenCalledWith({
        where: { id: 'p9', organisation: 'org1', deletedAt: null, ...scope },
      });
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
      expect(prisma.assessmentOrganisationProfile.count).not.toHaveBeenCalled();
    });
    it.each([
      [
        'indicator-measure',
        'assessmentIndicatorMeasure',
        { id: 'r1', organisation: 'org1', deletedAt: null },
        { evaluation: { select: { profile: { select: { id: true } } } } },
        { evaluation: { profile: { id: 'p1' } } },
      ],
      [
        'risk',
        'assessmentRisk',
        { id: 'r1', evaluation: { organisation: 'org1' } },
        { evaluation: { select: { profile: { select: { id: true } } } } },
        { evaluation: { profile: { id: 'p1' } } },
      ],
      [
        'mitigation-measure',
        'assessmentMitigationMeasure',
        {
          id: 'r1',
          deletedAt: null,
          risk: { evaluation: { organisation: 'org1' } },
        },
        {
          risk: {
            select: {
              evaluation: { select: { profile: { select: { id: true } } } },
            },
          },
        },
        { risk: { evaluation: { profile: { id: 'p1' } } } },
      ],
      [
        'profile',
        'assessmentOrganisationProfile',
        { id: 'r1', organisation: 'org1', deletedAt: null },
        { id: true },
        { id: 'p1' },
      ],
    ] as const)(
      'finds the organisation of a %s only inside the project',
      async (resource, model, where, select, row) => {
        (prisma as unknown as Record<string, { findFirst: jest.Mock }>)[
          model
        ].findFirst.mockResolvedValue(row);
        prisma.assessmentOrganisationProfile.count.mockResolvedValue(1);
        await expect(
          service.assertInScope(
            'org1',
            { evaluatorId: 'user1' },
            resource,
            'r1',
          ),
        ).resolves.toBeUndefined();
        expect(
          (prisma as unknown as Record<string, { findFirst: jest.Mock }>)[model]
            .findFirst,
        ).toHaveBeenCalledWith({ where, select });
        expect(prisma.assessmentOrganisationProfile.count).toHaveBeenCalledWith(
          {
            where: {
              id: 'p1',
              organisation: 'org1',
              deletedAt: null,
              evaluatorId: 'user1',
            },
          },
        );
      },
    );

    it.each(['indicator-measure', 'risk'] as const)(
      'answers 404 when the %s does not exist',
      async (resource) => {
        await expect(
          service.assertInScope(
            'org1',
            { evaluatorId: 'user1' },
            resource,
            'x',
          ),
        ).rejects.toThrow(NotFoundException);
        expect(
          prisma.assessmentOrganisationProfile.count,
        ).not.toHaveBeenCalled();
      },
    );
  });
});
