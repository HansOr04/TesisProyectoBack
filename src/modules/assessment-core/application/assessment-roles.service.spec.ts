import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AssessmentRolesService } from './assessment-roles.service';
import { AssessmentAuditService } from './assessment-audit.service';

type AnyRecord = Record<string, any>;

function createPrismaMock() {
  return {
    authRole: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    authUserRole: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    assessmentEvaluation: {
      count: jest.fn(),
    },
    activityLog: {
      findMany: jest.fn(),
    },
  } as AnyRecord;
}

function createAuditServiceMock() {
  return { record: jest.fn() } as AnyRecord;
}

describe('AssessmentRolesService (F2-B03)', () => {
  let prisma: AnyRecord;
  let audit: AnyRecord;
  let service: AssessmentRolesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    audit = createAuditServiceMock();
    service = new AssessmentRolesService(
      prisma as unknown as PrismaService,
      audit as unknown as AssessmentAuditService,
    );
  });

  describe('assign', () => {
    it('throws NotFoundException when the Assessment role is not seeded', async () => {
      prisma.authRole.findFirst.mockResolvedValue(null);

      await expect(
        service.assign('mh', 'user-1', 'assessment_evaluator', 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when userId does not refer to a real user', async () => {
      prisma.authRole.findFirst.mockResolvedValue({ id: 'role-1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assign('mh', 'user-1', 'assessment_evaluator', 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when the user already has the role', async () => {
      prisma.authRole.findFirst.mockResolvedValue({ id: 'role-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.authUserRole.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.assign('mh', 'user-1', 'assessment_evaluator', 'admin-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the AuthUserRole and records an audit log', async () => {
      prisma.authRole.findFirst.mockResolvedValue({ id: 'role-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.authUserRole.findFirst.mockResolvedValue(null);
      prisma.authUserRole.upsert.mockResolvedValue({
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
      });

      const result = await service.assign(
        'mh',
        'user-1',
        'assessment_evaluator',
        'admin-1',
      );

      expect(result.id).toBe('ur-1');
      expect(prisma.authUserRole.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organisation_userId_roleId: {
              organisation: 'mh',
              userId: 'user-1',
              roleId: 'role-1',
            },
          },
          update: { deletedAt: null, assignedBy: 'admin-1' },
          create: {
            organisation: 'mh',
            userId: 'user-1',
            roleId: 'role-1',
            assignedBy: 'admin-1',
          },
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        'mh',
        'assessment-role.assign',
        expect.objectContaining({
          userId: 'user-1',
          roleCode: 'assessment_evaluator',
        }),
        'admin-1',
      );
    });
  });

  describe('revoke', () => {
    const userRole = {
      id: 'ur-1',
      userId: 'user-1',
      role: { code: 'assessment_evaluator' },
    };

    it('throws NotFoundException when the assignment does not exist', async () => {
      prisma.authUserRole.findFirst.mockResolvedValue(null);

      await expect(
        service.revoke('mh', 'ur-1', false, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when the user has active evaluations and confirm=false', async () => {
      prisma.authUserRole.findFirst.mockResolvedValue(userRole);
      prisma.assessmentEvaluation.count.mockResolvedValue(2);

      await expect(
        service.revoke('mh', 'ur-1', false, 'admin-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.authUserRole.update).not.toHaveBeenCalled();
    });

    it('revokes (soft-delete) and skips the active-evaluation check when confirm=true', async () => {
      prisma.authUserRole.findFirst.mockResolvedValue(userRole);
      prisma.authUserRole.update.mockResolvedValue({
        ...userRole,
        deletedAt: new Date(),
      });

      await service.revoke('mh', 'ur-1', true, 'admin-1');

      expect(prisma.assessmentEvaluation.count).not.toHaveBeenCalled();
      expect(prisma.authUserRole.update).toHaveBeenCalledWith({
        where: { id: 'ur-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(audit.record).toHaveBeenCalledWith(
        'mh',
        'assessment-role.revoke',
        expect.objectContaining({
          userId: 'user-1',
          roleCode: 'assessment_evaluator',
        }),
        'admin-1',
      );
    });
  });

  describe('history', () => {
    it('combines AuthUserRole assignments (incl. revoked) with activity logs', async () => {
      prisma.authUserRole.findMany.mockResolvedValue([{ id: 'ur-1' }]);
      prisma.activityLog.findMany.mockResolvedValue([{ id: 'log-1' }]);

      const result = await service.history('mh', 'user-1');

      expect(result.assignments).toEqual([{ id: 'ur-1' }]);
      expect(result.activityLogs).toEqual([{ id: 'log-1' }]);
      // El historial incluye revocaciones: no debe filtrar por deletedAt.
      const call = prisma.authUserRole.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('deletedAt');
    });
  });
});
