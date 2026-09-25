import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TOKEN_ISSUER, TokenIssuerPort } from '../../identity/domain/ports';
import {
  RealtimeNotifierPort,
  ScoreUpdatedEvent,
} from '../domain/ports/realtime-notifier.port';

export interface AssessmentSocketAuth {
  userId: string;
  email: string;
  organisations: string[];
  isSuperAdmin: boolean;
}

// Varios facilitadores calificando la misma evaluación en el taller ven el
// avance del otro en vivo. Namespace propio /assessment, sala por evaluación
// (eval:<evaluationId>) para no reenviar eventos a clientes ajenos. El
// handshake valida el mismo JWT que la API HTTP.
@WebSocketGateway({ namespace: '/assessments', cors: true })
export class AssessmentSessionGateway
  implements OnGatewayConnection, RealtimeNotifierPort
{
  private readonly logger = new Logger(AssessmentSessionGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(@Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Missing token');
      }
      const payload = await this.tokens.verify(token);
      if (!payload.email) {
        throw new Error('Invalid token, missing email');
      }
      const socketAuth: AssessmentSocketAuth = {
        userId: payload.sub,
        email: payload.email,
        organisations: payload.orgs ?? [],
        isSuperAdmin: payload.isSuperAdmin === true,
      };
      client.data.auth = socketAuth;
    } catch (error) {
      this.logger.warn(`WS handshake rejected: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { org?: string; evaluationId?: string },
  ): void {
    const socketAuth = client.data.auth as AssessmentSocketAuth | undefined;
    if (!socketAuth || !body?.org || !body?.evaluationId) {
      return;
    }
    if (
      !socketAuth.isSuperAdmin &&
      !socketAuth.organisations.includes(body.org)
    ) {
      client.emit('error', { message: 'Not a member of this organisation' });
      return;
    }
    void client.join(this.room(body.evaluationId));
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { evaluationId?: string },
  ): void {
    if (!body?.evaluationId) return;
    void client.leave(this.room(body.evaluationId));
  }

  /** Llamado por los servicios de herramienta tras persistir una respuesta. Nunca lanza. */
  emitScoreUpdated(evaluationId: string, payload: ScoreUpdatedEvent): void {
    try {
      this.server?.to(this.room(evaluationId)).emit('score.updated', payload);
    } catch (error) {
      this.logger.warn(
        `Failed to emit score.updated for ${evaluationId}: ${(error as Error).message}`,
      );
    }
  }

  private room(evaluationId: string): string {
    return `eval:${evaluationId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return undefined;
  }
}
