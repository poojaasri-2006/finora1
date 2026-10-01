import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.EDIT_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const existing = await prisma.businessObligation.findFirst({
      where: { id, organizationId: auth.organizationId },
      select: { id: true, name: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.type === 'string') data.type = body.type;
    if (Number.isInteger(body.amountCents) && body.amountCents > 0) data.amountCents = body.amountCents;
    if (typeof body.dueDate === 'string') data.dueDate = body.dueDate;
    if (typeof body.recurrence === 'string') data.recurrence = body.recurrence;
    const allowedStatus = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
    if (typeof body.status === 'string' && allowedStatus.includes(body.status)) data.status = body.status;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const obligation = await prisma.businessObligation.update({ where: { id }, data });
    await prisma.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'UPDATE',
        entityType: 'BusinessObligation',
        entityId: id,
        changes: JSON.stringify(data),
      },
    });

    return NextResponse.json({ obligation });
  } catch {
    return NextResponse.json({ error: 'Failed to update obligation' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.DELETE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await context.params;

    const existing = await prisma.businessObligation.findFirst({
      where: { id, organizationId: auth.organizationId },
      select: { id: true, name: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.businessObligation.delete({ where: { id } });
    await prisma.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'DELETE',
        entityType: 'BusinessObligation',
        entityId: id,
        changes: JSON.stringify({ deleted: existing.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete obligation' }, { status: 500 });
  }
}
