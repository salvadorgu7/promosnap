// Role-based access control foundation.
// Not wired into auth yet — provides the permission model for future use.

export type Role = 'admin' | 'editor' | 'viewer'

export type Permission =
  | 'manage_products'
  | 'manage_imports'
  | 'view_analytics'
  | 'manage_settings'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['manage_products', 'manage_imports', 'view_analytics', 'manage_settings'],
  editor: ['manage_products', 'manage_imports', 'view_analytics'],
  viewer: ['view_analytics'],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
