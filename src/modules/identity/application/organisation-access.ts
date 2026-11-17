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

/**
 * Decide con qué alcance entra un usuario a un proyecto. Lo usan el guard de
 * HTTP y el de WebSocket, para que las dos puertas apliquen la misma regla.
 *
 * La membresía se comprueba primero contra el token y, si no está ahí, contra
 * la base: así quien acaba de ser agregado a un proyecto entra sin tener que
 * cerrar sesión.
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
  if (user.organisations.includes(organisation)) {
    return { allowed: true, isSuperAdmin: false };
  }
  const member = await prisma.organisationMember.findUnique({
    where: {
      organisationId_userId: {
        organisationId: organisation,
        userId: user.userId,
      },
    },
    select: { id: true },
  });
  return { allowed: Boolean(member), isSuperAdmin: false };
}
