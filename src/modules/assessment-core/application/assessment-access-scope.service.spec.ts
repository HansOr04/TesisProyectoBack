import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentAccessScopeService } from './assessment-access-scope.service';
import { AuthorizationService } from '../../identity/application/authorization.service';

describe('AssessmentAccessScopeService', () => {
  let service: AssessmentAccessScopeService;
  let authorizationService: { getUserRoles: jest.Mock };

  beforeEach(async () => {
    authorizationService = { getUserRoles: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentAccessScopeService,
        { provide: AuthorizationService, useValue: authorizationService },
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
});
