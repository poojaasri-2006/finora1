import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

const financingSchema = z.object({
  name: z.string().min(1),
  lender: z.string().min(1),
  type: z.enum(['TERM_LOAN', 'REVOLVING_CREDIT', 'EQUIPMENT_FINANCING', 'LEASE', 'MERCHANT_CASH_ADVANCE', 'OTHER']),
  originalPrincipalCents: z.number().int().positive(),
  outstandingPrincipalCents: z.number().int().positive(),
  annualInterestRate: z.number().min(0).max(1),
  interestType: z.enum(['FIXED', 'VARIABLE']).default('FIXED'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
  repaymentMethod: z.enum(['AMORTIZING', 'EQUAL_PRINCIPAL', 'INTEREST_ONLY', 'BULLET']),
  feesCents: z.number().int().default(0),
  gracePeriodMonths: z.number().int().default(0),
  status: z.enum(['ACTIVE', 'PAID_OFF', 'DEFAULTED', 'CANCELLED']).default('ACTIVE'),
  notes: z.string().default(''),
});

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const accounts = await prisma.financingAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch financing accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId, role } = context;

    // Check permissions
    if (!checkRole(role, ROLE_PERMISSIONS.CREATE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const data = financingSchema.parse(body);

    const account = await prisma.financingAccount.create({
      data: {
        ...data,
        organizationId,
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        organizationId,
        userId: context.userId,
        action: 'CREATE',
        entityType: 'FinancingAccount',
        entityId: account.id,
        changes: JSON.stringify({ new: data }),
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create financing account' }, { status: 500 });
  }
}
