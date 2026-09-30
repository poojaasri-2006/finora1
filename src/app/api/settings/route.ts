import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId, role } = context;

    if (!checkRole(role, ROLE_PERMISSIONS.MANAGE_SETTINGS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: body,
    });

    await prisma.auditEvent.create({
      data: {
        organizationId,
        userId: context.userId,
        action: 'UPDATE',
        entityType: 'Organization',
        entityId: org.id,
        changes: JSON.stringify({ new: body }),
      },
    });

    return NextResponse.json({ organization: org });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
