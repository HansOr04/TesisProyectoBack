import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const REQUIRE_AUTHENTICATED_KEY = 'auth:requireAuthenticated';
export const REQUIRE_SUPERADMIN_KEY = 'auth:requireGlobalSuperAdmin';

/** Ruta sin token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Usuario autenticado (JWT válido). Si la ruta tiene `:org`, el usuario debe
 * ser miembro de esa organización (o superadmin).
 */
export const RequireAuthenticated = () =>
  SetMetadata(REQUIRE_AUTHENTICATED_KEY, true);

/** Solo superadmin global (User.isSuperAdmin). */
export const RequireGlobalSuperAdmin = () =>
  SetMetadata(REQUIRE_SUPERADMIN_KEY, true);
