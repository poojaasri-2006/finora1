import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, checkRole, ROLE_PERMISSIONS } from '@/lib/api';

export async function GET() {
  const context = await requireOrganization();
  if (context instanceof NextResponse) return context;
  if (!checkRole(context.role, ROLE_PERMISSIONS.MANAGE_SETTINGS)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  const events = await prisma.auditEvent.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, action: true, entityType: true, createdAt: true },
  });
  return NextResponse.json({ events });
}
