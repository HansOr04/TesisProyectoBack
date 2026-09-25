export const OAUTH_VERIFIER = Symbol('OAUTH_VERIFIER');

export interface OAuthIdentity {
  provider: string;
  subject: string;
  email: string;
  name?: string;
}

// Un proveedor OAuth (Google hoy; GitHub/Microsoft mañana) solo tiene que
// saber verificar un id_token y devolver la identidad — Strategy.
export interface OAuthVerifierPort {
  readonly provider: string;
  readonly enabled: boolean;
  verify(idToken: string): Promise<OAuthIdentity>;
}
