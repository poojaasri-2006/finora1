import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateProjection } from '@/domain/projection/engine';
import { generateAlerts } from '@/domain/alerts/engine';
import { generateSchedule } from '@/domain/schedule';
import { addMonths, todayISO } from '@/domain/dates';
import { requireOrganization } from '@/lib/api';

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    // Get organization with current cash
    const org = await prisma.organization.findFirst({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Get all data for the organization
    const [cashFlows, obligations, financingAccounts, scenarios] = await Promise.all([
      prisma.cashFlowEntry.findMany({ where: { organizationId } }),
      prisma.businessObligation.findMany({ where: { organizationId } }),
      prisma.financingAccount.findMany({ where: { organizationId } }),
      prisma.scenario.findMany({ where: { organizationId }, include: { adjustments: true } }),
    ]);

    // Generate financing schedules
    const allInstallments = [];
    for (const account of financingAccounts) {
      if (account.status !== 'ACTIVE') continue;
      const schedule = generateSchedule({
        principalCents: account.outstandingPrincipalCents,
        annualRate: account.annualInterestRate,
        startDate: account.startDate,
        maturityDate: account.maturityDate,
        frequency: account.paymentFrequency as any,
        repaymentMethod: account.repaymentMethod as any,
        feesCents: account.feesCents,
        gracePeriodMonths: account.gracePeriodMonths,
      });
      allInstallments.push(...schedule);
    }

    // Generate projection
    const startDate = todayISO();
    const endDate = addMonths(startDate, 12);

    // Use organization's current cash from database
    const openingCashCents = org.currentCashCents;

    const projection = generateProjection({
      organizationId,
      scenarioId: 'base',
      periodType: org.defaultProjectionPeriod as any,
      startDate,
      endDate,
      openingCashCents,
      minimumReserveCents: org.minimumCashReserveCents,
      cashFlows: cashFlows as any,
      obligations: obligations as any,
      financingSchedules: allInstallments,
      scenario: scenarios.find((s) => s.type === 'BASE') as any ?? null,
    });

    // Generate alerts
    const alerts = generateAlerts({
      organizationId,
      minimumReserveCents: org.minimumCashReserveCents,
      currency: org.baseCurrency,
      obligations: obligations as any,
      installments: allInstallments,
      projection,
      scenarios: scenarios as any,
      scenarioProjections: new Map(),
    });

    return NextResponse.json({
      projection,
      alerts,
      obligations,
      installments: allInstallments,
      currency: org.baseCurrency,
      minimumReserveCents: org.minimumCashReserveCents,
      openingCashCents,
      organization: {
        id: org.id,
        name: org.name,
        baseCurrency: org.baseCurrency,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard data' },
      { status: 500 },
    );
  }
}
