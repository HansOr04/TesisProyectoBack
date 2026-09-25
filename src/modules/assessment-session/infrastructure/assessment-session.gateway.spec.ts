import { AssessmentSessionGateway } from './assessment-session.gateway';

function createMockSocket(
  overrides: Partial<{ token: string; header: string }> = {},
) {
  return {
    handshake: {
      auth: overrides.token !== undefined ? { token: overrides.token } : {},
      headers: overrides.header
        ? { authorization: overrides.header }
        : ({} as Record<string, string>),
    },
    data: {} as Record<string, unknown>,
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
  };
}

describe('AssessmentSessionGateway', () => {
  let gateway: AssessmentSessionGateway;
  let verify: jest.Mock;

  beforeEach(() => {
    verify = jest.fn();
    gateway = new AssessmentSessionGateway({ verify, sign: jest.fn() });
  });

  describe('handleConnection', () => {
    it('accepts a valid token and stores decoded auth on the socket', async () => {
      verify.mockResolvedValue({
        sub: 'user-1',
        email: 'eval@evaluacion.local',
        orgs: ['demo'],
        isSuperAdmin: false,
      });
      const client = createMockSocket({ token: 'valid-token' });
      await gateway.handleConnection(client as any);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data.auth).toEqual({
        userId: 'user-1',
        email: 'eval@evaluacion.local',
        organisations: ['demo'],
        isSuperAdmin: false,
      });
    });

    it('reads the token from the Authorization header', async () => {
      verify.mockResolvedValue({
        sub: 'user-1',
        email: 'eval@evaluacion.local',
        orgs: [],
        isSuperAdmin: true,
      });
      const client = createMockSocket({ header: 'Bearer abc' });
      await gateway.handleConnection(client as any);
      expect(verify).toHaveBeenCalledWith('abc');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects when no token is provided', async () => {
      const client = createMockSocket();
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects when the token is invalid', async () => {
      verify.mockRejectedValue(new Error('bad token'));
      const client = createMockSocket({ token: 'bad' });
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleJoin', () => {
    it('joins the evaluation room when the user belongs to the org', () => {
      const client = createMockSocket();
      client.data.auth = {
        userId: 'u',
        email: 'e',
        organisations: ['demo'],
        isSuperAdmin: false,
      };
      gateway.handleJoin(client as any, { org: 'demo', evaluationId: 'ev-1' });
      expect(client.join).toHaveBeenCalledWith('eval:ev-1');
    });

    it('rejects a join for an org the user does not belong to', () => {
      const client = createMockSocket();
      client.data.auth = {
        userId: 'u',
        email: 'e',
        organisations: ['other'],
        isSuperAdmin: false,
      };
      gateway.handleJoin(client as any, { org: 'demo', evaluationId: 'ev-1' });
      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('lets a superadmin join any org', () => {
      const client = createMockSocket();
      client.data.auth = {
        userId: 'u',
        email: 'e',
        organisations: [],
        isSuperAdmin: true,
      };
      gateway.handleJoin(client as any, { org: 'demo', evaluationId: 'ev-1' });
      expect(client.join).toHaveBeenCalledWith('eval:ev-1');
    });
  });

  describe('emitScoreUpdated', () => {
    it('emits to the evaluation room', () => {
      const emit = jest.fn();
      gateway.server = { to: jest.fn().mockReturnValue({ emit }) } as any;
      gateway.emitScoreUpdated('ev-1', {
        evaluationId: 'ev-1',
        indicatorIds: ['i'],
        scoredBy: 'u',
      });
      expect(gateway.server.to).toHaveBeenCalledWith('eval:ev-1');
      expect(emit).toHaveBeenCalledWith('score.updated', expect.any(Object));
    });

    it('never throws when the server is unavailable', () => {
      gateway.server = undefined as any;
      expect(() =>
        gateway.emitScoreUpdated('ev-1', {
          evaluationId: 'ev-1',
          indicatorIds: [],
          scoredBy: 'u',
        }),
      ).not.toThrow();
    });
  });
});
