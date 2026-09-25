import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CanPerformActionResult,
  UserPermission,
  UserRoleWithPermissions,
} from '../domain/permission.types';

// RBAC por organización: rol → permisos (módulo:acción). Un usuario puede
// tener varios roles en la misma organización; se unen sus permisos.
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserRoles(
    organisation: string,
    userId: string,
  ): Promise<UserRoleWithPermissions[]> {
    const rows = await this.prisma.authUserRole.findMany({
      where: { organisation, userId, deletedAt: null },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: { include: { module: true } } },
            },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      organisation: row.organisation,
      userId: row.userId,
      role: {
        id: row.role.id,
        code: row.role.code,
        name: row.role.name,
        permissions: row.role.permissions.map((rp) => ({
          permission: {
            moduleCode: rp.permission.module.code,
            permissionCode: rp.permission.code,
          },
        })),
      },
    }));
  }

  async getUserPermissions(
    organisation: string,
    userId: string,
  ): Promise<UserPermission[]> {
    const roles = await this.getUserRoles(organisation, userId);
    const seen = new Set<string>();
    const permissions: UserPermission[] = [];
    for (const userRole of roles) {
      for (const { permission } of userRole.role.permissions) {
        const key = `${permission.moduleCode}:${permission.permissionCode}`;
        if (!seen.has(key)) {
          seen.add(key);
          permissions.push(permission);
        }
      }
    }
    return permissions;
  }

  async canPerformAction(
    organisation: string,
    userId: string,
    moduleCode: string,
    action: string,
    isSuperAdmin = false,
  ): Promise<CanPerformActionResult> {
    if (isSuperAdmin) {
      return {
        moduleCode,
        action,
        allowed: true,
        reason: 'Super admin access',
      };
    }
    const permissions = await this.getUserPermissions(organisation, userId);
    const has = (code: string) =>
      permissions.some(
        (p) => p.moduleCode === moduleCode && p.permissionCode === code,
      );
    if (has(action)) {
      return { moduleCode, action, allowed: true };
    }
    if (has('admin')) {
      return {
        moduleCode,
        action,
        allowed: true,
        reason: 'Module admin access',
      };
    }
    return { moduleCode, action, allowed: false, reason: 'Permission denied' };
  }
}
