export const OAUTH_VERIFIER = Symbol('OAUTH_VERIFIER');

export interface OAuthIdentity {
  provider: string;
  subject: string;
  email: string;
  name?: string;
}

export interface OAuthVerifierPort {
  readonly provider: string;
  readonly enabled: boolean;
  verify(idToken: string): Promise<OAuthIdentity>;
}
