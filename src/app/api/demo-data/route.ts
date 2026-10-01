import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';
import { seedOrganizationDemoData } from '@/lib/demo-seed';

/**
 * Load demo data for the current organization. Explicit user action, idempotent.
 */
export async function POST() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId, role } = context;
    if (!checkRole(role, ROLE_PERMISSIONS.CREATE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await seedOrganizationDemoData(organizationId);

    await prisma.auditEvent.create({
      data: { organizationId, userId: context.userId, action: 'CREATE', entityType: 'DemoData', entityId: 'demo', changes: JSON.stringify({ message: 'Demo data loaded' }) },
    });

    return NextResponse.json({ message: 'Demo data loaded successfully' });
  } catch (error) {
    console.error('Demo data error:', error);
    return NextResponse.json({ error: 'Failed to load demo data' }, { status: 500 });
  }
}
