/**
 * API route helpers — get organization context from session.
 */

import { NextResponse } from 'next/server';
import { getSession } from './auth';

export interface OrganizationContext {
  organizationId: string;
  userId: string;
  role: string;
}

/**
 * Get the organization context for the current request.
 * Returns null if not authenticated.
 */
export async function getOrganizationContext(): Promise<OrganizationContext | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    organizationId: session.organizationId,
    userId: session.userId,
    role: session.role,
  };
}

/**
 * Get the organization context or return a 401 response.
 */
export async function requireOrganization(): Promise<OrganizationContext | NextResponse> {
  const context = await getOrganizationContext();
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return context;
}

/**
 * Check if the user has the required role.
 */
export function checkRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Role-based access control for API routes.
 */
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  VIEWER: 'VIEWER',
} as const;

export const ROLE_PERMISSIONS = {
  MANAGE_USERS: [ROLES.OWNER, ROLES.ADMIN],
  MANAGE_SETTINGS: [ROLES.OWNER, ROLES.ADMIN],
  CREATE_RECORDS: [ROLES.OWNER, ROLES.ADMIN, ROLES.FINANCE_MANAGER],
  EDIT_RECORDS: [ROLES.OWNER, ROLES.ADMIN, ROLES.FINANCE_MANAGER],
  DELETE_RECORDS: [ROLES.OWNER, ROLES.ADMIN],
  VIEW_DATA: [ROLES.OWNER, ROLES.ADMIN, ROLES.FINANCE_MANAGER, ROLES.VIEWER],
};
