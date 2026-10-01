export const ROLE_CREATE = ['OWNER', 'ADMIN', 'FINANCE_MANAGER'];
export const ROLE_DELETE = ['OWNER', 'ADMIN'];
export const ROLE_MANAGE = ['OWNER', 'ADMIN'];

export function canCreate(role?: string | null): boolean {
  return !!role && ROLE_CREATE.includes(role);
}

export function canDelete(role?: string | null): boolean {
  return !!role && ROLE_DELETE.includes(role);
}

export function canManage(role?: string | null): boolean {
  return !!role && ROLE_MANAGE.includes(role);
}
