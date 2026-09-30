import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';

/**
 * Load demo data for the current organization.
 * This is an explicit user action — demo data is never loaded automatically.
 */
export async function POST() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId, role } = context;

    if (!checkRole(role, ROLE_PERMISSIONS.CREATE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if demo data already exists
    const existingLoans = await prisma.financingAccount.count({
      where: { organizationId },
    });

    if (existingLoans > 0) {
      return NextResponse.json(
        { error: 'Demo data can only be loaded once. Organization already has financing accounts.' },
        { status: 400 },
      );
    }

    // Create demo financing accounts
    const loan1 = await prisma.financingAccount.create({
      data: {
        organizationId,
        name: 'Equipment Term Loan',
        lender: 'First National Bank',
        type: 'TERM_LOAN',
        originalPrincipalCents: 20000000,
        outstandingPrincipalCents: 15000000,
        annualInterestRate: 0.075,
        interestType: 'FIXED',
        startDate: '2024-01-15',
        maturityDate: '2027-01-15',
        paymentFrequency: 'MONTHLY',
        repaymentMethod: 'AMORTIZING',
        paymentAmountCents: 463000,
        feesCents: 200000,
        gracePeriodMonths: 0,
        status: 'ACTIVE',
        notes: 'CNC machine purchase',
      },
    });

    const loan2 = await prisma.financingAccount.create({
      data: {
        organizationId,
        name: 'Working Capital Line',
        lender: 'Community Credit Union',
        type: 'REVOLVING_CREDIT',
        originalPrincipalCents: 10000000,
        outstandingPrincipalCents: 3500000,
        annualInterestRate: 0.095,
        interestType: 'VARIABLE',
        startDate: '2023-06-01',
        maturityDate: '2026-06-01',
        paymentFrequency: 'MONTHLY',
        repaymentMethod: 'INTEREST_ONLY',
        paymentAmountCents: 27500,
        feesCents: 0,
        gracePeriodMonths: 0,
        status: 'ACTIVE',
        notes: 'Seasonal working capital',
      },
    });

    // Create demo cash flow entries
    const cashFlows = [
      { name: 'Product Sales', category: 'REVENUE', type: 'INFLOW', amountCents: 8500000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Service Revenue', category: 'REVENUE', type: 'INFLOW', amountCents: 2500000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Payroll', category: 'PAYROLL', type: 'OUTFLOW', amountCents: 4500000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Raw Materials', category: 'VENDOR_PAYMENTS', type: 'OUTFLOW', amountCents: 3200000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Facility Rent', category: 'RENT', type: 'OUTFLOW', amountCents: 1200000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Utilities', category: 'UTILITIES', type: 'OUTFLOW', amountCents: 180000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Insurance', category: 'INSURANCE', type: 'OUTFLOW', amountCents: 90000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
      { name: 'Quarterly Tax Payment', category: 'TAXES', type: 'OUTFLOW', amountCents: 800000, recurrence: 'QUARTERLY', startDate: '2025-03-15', status: 'PROJECTED' },
      { name: 'Marketing', category: 'MARKETING', type: 'OUTFLOW', amountCents: 150000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    ];

    for (const cf of cashFlows) {
      await prisma.cashFlowEntry.create({
        data: { ...cf, organizationId },
      });
    }

    // Create demo obligations
    const obligations = [
      { name: 'Monthly Payroll', type: 'PAYROLL', amountCents: 4500000, dueDate: '2025-02-01', recurrence: 'MONTHLY' },
      { name: 'Raw Materials Supplier', type: 'VENDOR', amountCents: 3200000, dueDate: '2025-02-05', recurrence: 'MONTHLY' },
      { name: 'Facility Rent', type: 'RENT', amountCents: 1200000, dueDate: '2025-02-01', recurrence: 'MONTHLY' },
      { name: 'Q1 Tax Payment', type: 'TAX', amountCents: 800000, dueDate: '2025-03-15', recurrence: 'QUARTERLY' },
    ];

    for (const ob of obligations) {
      await prisma.businessObligation.create({
        data: { ...ob, organizationId },
      });
    }

    // Create base scenario
    await prisma.scenario.create({
      data: {
        organizationId,
        name: 'Base Case',
        type: 'BASE',
        description: 'Current financial position with no adjustments',
      },
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        organizationId,
        userId: context.userId,
        action: 'CREATE',
        entityType: 'DemoData',
        entityId: 'demo',
        changes: JSON.stringify({ message: 'Demo data loaded' }),
      },
    });

    return NextResponse.json({
      message: 'Demo data loaded successfully',
      loans: 2,
      cashFlows: cashFlows.length,
      obligations: obligations.length,
    });
  } catch (error) {
    console.error('Demo data error:', error);
    return NextResponse.json(
      { error: 'Failed to load demo data' },
      { status: 500 },
    );
  }
}
