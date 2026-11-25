import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface OrganisationAccess {
  allowed: boolean;
  isSuperAdmin: boolean;
}

export interface CurrentAccount {
  isSuperAdmin: boolean;
  organisations: string[];
}

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
