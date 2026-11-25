export interface AuthContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  isPlatformSuperAdmin: boolean;
  organisations: string[];
}

export const AUTH_CONTEXT_KEY = 'auth';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  orgs: string[];
}
