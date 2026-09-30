import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization } from '@/lib/api';

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const scenarios = await prisma.scenario.findMany({
      where: { organizationId },
      include: { adjustments: true },
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}
