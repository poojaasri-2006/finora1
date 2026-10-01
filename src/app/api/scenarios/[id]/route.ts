import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.DELETE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await context.params;

    const existing = await prisma.scenario.findFirst({
      where: { id, organizationId: auth.organizationId },
      select: { id: true, name: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.scenario.delete({ where: { id } });
    await prisma.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'DELETE',
        entityType: 'Scenario',
        entityId: id,
        changes: JSON.stringify({ deleted: existing.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
  }
}
