import { AccessTokenPayload } from '../auth-context';

export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface TokenIssuerPort {
  sign(payload: AccessTokenPayload): Promise<string>;
  verify(token: string): Promise<AccessTokenPayload>;
}
