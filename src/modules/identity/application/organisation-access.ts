import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface OrganisationAccess {
  /** Puede entrar al proyecto: es miembro o es el superadministrador que lo creó. */
  allowed: boolean;
  /**
   * Superadministrador con acceso total en ESTE proyecto: solo el que lo creó.
   * Un superadministrador en un proyecto ajeno entra como cualquier miembro,
   * con el rol que le hayan asignado.
   */
  isSuperAdmin: boolean;
}

export interface CurrentAccount {
  isSuperAdmin: boolean;
  /** Proyectos de los que es miembro ahora mismo. */
  organisations: string[];
}

/**
 * Estado actual de la cuenta, leído de la base y no del token: el token dura
 * horas, y a quien se desactiva, se le quita el superadministrador o se saca
 * de un proyecto debe perder ese acceso de inmediato.
 */
export async function loadCurrentAccount(
  prisma: PrismaService,
  userId: string,
): Promise<CurrentAccount | null> {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isActive: true,
      deletedAt: true,
      isSuperAdmin: true,
      memberships: { select: { organisationId: true } },
    },
  });
  if (!account || !account.isActive || account.deletedAt) return null;
  return {
    isSuperAdmin: account.isSuperAdmin,
    organisations: account.memberships.map((m) => m.organisationId),
  };
}

/**
 * Decide con qué alcance entra un usuario a un proyecto. Lo usan el guard de
 * HTTP y el de WebSocket, para que las dos puertas apliquen la misma regla,
 * siempre con la cuenta de loadCurrentAccount.
 */
export async function resolveOrganisationAccess(
  prisma: PrismaService,
  user: { userId: string; isSuperAdmin: boolean; organisations: string[] },
  organisation: string,
): Promise<OrganisationAccess> {
  const ownsIt =
    user.isSuperAdmin &&
    (await prisma.organisation.count({
      where: {
        id: organisation,
        createdById: user.userId,
        deletedAt: null,
      },
    })) > 0;
  if (ownsIt) {
    return { allowed: true, isSuperAdmin: true };
  }
  return {
    allowed: user.organisations.includes(organisation),
    isSuperAdmin: false,
  };
}
