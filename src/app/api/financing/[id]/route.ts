import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    const { id } = await context.params;
    const account = await prisma.financingAccount.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ account });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch financing account' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOrganization();
    if (auth instanceof NextResponse) return auth;
    if (!checkRole(auth.role, ROLE_PERMISSIONS.EDIT_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await context.params;
    const existing = await prisma.financingAccount.findFirst({
      where: { id, organizationId: auth.organizationId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    for (const key of ['name', 'lender', 'startDate', 'maturityDate', 'paymentFrequency', 'repaymentMethod', 'status', 'notes'] as const) {
      if (typeof body[key] === 'string') data[key] = body[key];
    }
    for (const key of ['originalPrincipalCents', 'outstandingPrincipalCents', 'feesCents', 'gracePeriodMonths'] as const) {
      if (Number.isInteger(body[key])) data[key] = body[key];
    }
    if (typeof body.annualInterestRate === 'number' && body.annualInterestRate >= 0 && body.annualInterestRate <= 1) {
      data.annualInterestRate = body.annualInterestRate;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const account = await prisma.financingAccount.update({ where: { id }, data });
    await prisma.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'UPDATE',
        entityType: 'FinancingAccount',
        entityId: id,
        changes: JSON.stringify(data),
      },
    });
    return NextResponse.json({ account });
  } catch {
    return NextResponse.json({ error: 'Failed to update financing account' }, { status: 500 });
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

    const existing = await prisma.financingAccount.findFirst({
      where: { id, organizationId: auth.organizationId },
      select: { id: true, name: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.financingAccount.delete({ where: { id } });
    await prisma.auditEvent.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'DELETE',
        entityType: 'FinancingAccount',
        entityId: id,
        changes: JSON.stringify({ deleted: existing.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete financing account' }, { status: 500 });
  }
}
