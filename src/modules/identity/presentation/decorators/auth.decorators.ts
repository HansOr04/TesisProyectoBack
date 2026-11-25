import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const REQUIRE_AUTHENTICATED_KEY = 'auth:requireAuthenticated';
export const REQUIRE_SUPERADMIN_KEY = 'auth:requireGlobalSuperAdmin';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RequireAuthenticated = () =>
  SetMetadata(REQUIRE_AUTHENTICATED_KEY, true);

export const RequireGlobalSuperAdmin = () =>
  SetMetadata(REQUIRE_SUPERADMIN_KEY, true);
