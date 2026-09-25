// Identidad autenticada que viaja en la petición (request.auth) tras validar
// el JWT. Es lo único que la capa de presentación necesita del usuario.
export interface AuthContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  /** Ids de organización a las que pertenece el usuario. */
  organisations: string[];
}

export const AUTH_CONTEXT_KEY = 'auth';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  orgs: string[];
}
