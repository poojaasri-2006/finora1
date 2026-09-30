import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const obligations = await prisma.businessObligation.findMany({
      where: { organizationId },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ obligations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch obligations' }, { status: 500 });
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
    const obligation = await prisma.businessObligation.create({
      data: { ...body, organizationId },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId,
        userId: context.userId,
        action: 'CREATE',
        entityType: 'BusinessObligation',
        entityId: obligation.id,
        changes: JSON.stringify({ new: body }),
      },
    });

    return NextResponse.json({ obligation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create obligation' }, { status: 500 });
  }
}
