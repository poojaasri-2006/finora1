import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';
import { addDays, addMonths, todayISO } from '@/domain/dates';

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

    const today = todayISO();
    const recentMonth = addMonths(today, -1);

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
        startDate: recentMonth,
        maturityDate: addMonths(today, 24),
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
        startDate: recentMonth,
        maturityDate: addMonths(today, 18),
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
      { name: 'Product Sales', category: 'REVENUE', type: 'INFLOW', amountCents: 8500000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Service Revenue', category: 'REVENUE', type: 'INFLOW', amountCents: 2500000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Payroll', category: 'PAYROLL', type: 'OUTFLOW', amountCents: 4500000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Raw Materials', category: 'VENDOR_PAYMENTS', type: 'OUTFLOW', amountCents: 3200000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Facility Rent', category: 'RENT', type: 'OUTFLOW', amountCents: 1200000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Utilities', category: 'UTILITIES', type: 'OUTFLOW', amountCents: 180000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Insurance', category: 'INSURANCE', type: 'OUTFLOW', amountCents: 90000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
      { name: 'Quarterly Tax Payment', category: 'TAXES', type: 'OUTFLOW', amountCents: 800000, recurrence: 'QUARTERLY', startDate: addDays(today, 12), status: 'PROJECTED' },
      { name: 'Marketing', category: 'MARKETING', type: 'OUTFLOW', amountCents: 150000, recurrence: 'MONTHLY', startDate: recentMonth, status: 'PROJECTED' },
    ];

    for (const cf of cashFlows) {
      await prisma.cashFlowEntry.create({
        data: { ...cf, organizationId },
      });
    }

    // Create demo obligations
    const obligations = [
      { name: 'Monthly Payroll', type: 'PAYROLL', amountCents: 4500000, dueDate: addDays(today, 4), recurrence: 'MONTHLY' },
      { name: 'Raw Materials Supplier', type: 'VENDOR', amountCents: 3200000, dueDate: addDays(today, 8), recurrence: 'MONTHLY' },
      { name: 'Facility Rent', type: 'RENT', amountCents: 1200000, dueDate: addDays(today, 13), recurrence: 'MONTHLY' },
      { name: 'Quarterly Tax Payment', type: 'TAX', amountCents: 800000, dueDate: addDays(today, 20), recurrence: 'QUARTERLY' },
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
    await prisma.scenario.create({
      data: {
        organizationId,
        name: 'Slower sales',
        type: 'MILD_DOWNSIDE',
        description: 'Revenue declines by 12% while costs rise by 5%',
        adjustments: { create: [
          { type: 'REVENUE_DECLINE', value: 0.12, isPercentage: true, description: 'Slower customer receipts' },
          { type: 'EXPENSE_INCREASE', value: 0.05, isPercentage: true, description: 'Higher operating costs' },
        ] },
      },
    });
    await prisma.scenario.create({
      data: {
        organizationId,
        name: 'Severe downside',
        type: 'SEVERE_DOWNSIDE',
        description: 'Revenue declines by 25% while costs rise by 12%',
        adjustments: { create: [
          { type: 'REVENUE_DECLINE', value: 0.25, isPercentage: true, description: 'Major sales slowdown' },
          { type: 'EXPENSE_INCREASE', value: 0.12, isPercentage: true, description: 'Higher operating costs' },
        ] },
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
      scenarios: 3,
    });
  } catch (error) {
    console.error('Demo data error:', error);
    return NextResponse.json(
      { error: 'Failed to load demo data' },
      { status: 500 },
    );
  }
}
