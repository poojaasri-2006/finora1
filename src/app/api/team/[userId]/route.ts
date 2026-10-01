import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, checkRole, ROLE_PERMISSIONS } from '@/lib/api';

const ROLES = ['OWNER', 'ADMIN', 'FINANCE_MANAGER', 'VIEWER'];

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { userId } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.role !== 'string' || !ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId: auth.organizationId, userId },
    });
    if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (membership.role === 'OWNER' && body.role !== 'OWNER') {
      const owners = await prisma.organizationMembership.count({ where: { organizationId: auth.organizationId, role: 'OWNER' } });
      if (owners <= 1) return NextResponse.json({ error: 'Cannot demote the last owner' }, { status: 400 });
    }
    await prisma.organizationMembership.update({ where: { id: membership.id }, data: { role: body.role } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { userId } = await context.params;
    if (userId === auth.userId) return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    const membership = await prisma.organizationMembership.findFirst({ where: { organizationId: auth.organizationId, userId } });
    if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (membership.role === 'OWNER') {
      const owners = await prisma.organizationMembership.count({ where: { organizationId: auth.organizationId, role: 'OWNER' } });
      if (owners <= 1) return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
    }
    await prisma.organizationMembership.delete({ where: { id: membership.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
