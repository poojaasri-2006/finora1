import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization } from '@/lib/api';

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const alerts = await prisma.alert.findMany({
      where: { organizationId, isDismissed: false },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
