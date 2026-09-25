export interface UserPermission {
  moduleCode: string;
  permissionCode: string;
}

export interface CanPerformActionResult {
  moduleCode: string;
  action: string;
  allowed: boolean;
  reason?: string;
}

export interface UserRoleWithPermissions {
  id: string;
  organisation: string;
  userId: string;
  role: {
    id: string;
    code: string;
    name: string;
    permissions: { permission: UserPermission }[];
  };
}
