import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { OAuthIdentity, OAuthVerifierPort } from '../domain/ports';

// Login con Google (OAuth 2.0 / OpenID Connect). Gratis: solo requiere un
// OAuth Client ID de Google Cloud Console. El frontend obtiene el id_token
// con Google Identity Services y lo manda a POST /auth/google.
@Injectable()
export class GoogleOAuthVerifier implements OAuthVerifierPort {
  readonly provider = 'google';
  private readonly clientId: string | undefined;
  private readonly client: OAuth2Client;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('GOOGLE_OAUTH_CLIENT_ID') || undefined;
    this.client = new OAuth2Client(this.clientId);
  }

  get enabled(): boolean {
    return Boolean(this.clientId);
  }

  async verify(idToken: string): Promise<OAuthIdentity> {
    if (!this.enabled) {
      throw new UnauthorizedException(
        'Login con Google no está configurado (GOOGLE_OAUTH_CLIENT_ID)',
      );
    }
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token de Google inválido');
    }
    return {
      provider: this.provider,
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name,
    };
  }
}
