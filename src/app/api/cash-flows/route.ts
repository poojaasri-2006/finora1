import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const entries = await prisma.cashFlowEntry.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cash flows' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId, role } = context;

    if (!checkRole(role, ROLE_PERMISSIONS.CREATE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const entry = await prisma.cashFlowEntry.create({
      data: { ...body, organizationId },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId,
        userId: context.userId,
        action: 'CREATE',
        entityType: 'CashFlowEntry',
        entityId: entry.id,
        changes: JSON.stringify({ new: body }),
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create cash flow entry' }, { status: 500 });
  }
}
