import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, checkRole, ROLE_PERMISSIONS } from '@/lib/api';

export async function GET() {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.MANAGE_SETTINGS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: auth.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const members = memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      isSelf: m.userId === auth.userId,
    }));
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: 'Failed to load team' }, { status: 500 });
  }
}
