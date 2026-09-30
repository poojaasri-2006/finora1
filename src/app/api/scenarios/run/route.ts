import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateProjection } from '@/domain/projection/engine';
import { generateSchedule } from '@/domain/schedule';
import { addMonths, todayISO } from '@/domain/dates';
import { calculateSafeBorrowingCapacity } from '@/domain/capacity/safe-borrowing';

export async function POST() {
  try {
    const org = await prisma.organization.findFirst({ where: { id: 'demo-org' } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const [cashFlows, obligations, financingAccounts, scenarios] = await Promise.all([
      prisma.cashFlowEntry.findMany({ where: { organizationId: org.id } }),
      prisma.businessObligation.findMany({ where: { organizationId: org.id } }),
      prisma.financingAccount.findMany({ where: { organizationId: org.id } }),
      prisma.scenario.findMany({ where: { organizationId: org.id }, include: { adjustments: true } }),
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

    const startDate = todayISO();
    const endDate = addMonths(startDate, 12);
    const openingCashCents = 7500000;

    const results = [];

    for (const scenario of scenarios) {
      const projection = generateProjection({
        organizationId: org.id,
        scenarioId: scenario.id,
        periodType: org.defaultProjectionPeriod as any,
        startDate,
        endDate,
        openingCashCents,
        minimumReserveCents: org.minimumCashReserveCents,
        cashFlows: cashFlows as any,
        obligations: obligations as any,
        financingSchedules: allInstallments,
        scenario: scenario as any,
      });

      const capacity = calculateSafeBorrowingCapacity({
        projection,
        scenario: scenario as any,
        minimumReserveCents: org.minimumCashReserveCents,
        projectionMonths: 12,
        stressLevel: scenario.type === 'SEVERE_DOWNSIDE' ? 0.25 : scenario.type === 'MILD_DOWNSIDE' ? 0.10 : 0,
        requiredCoverageRatio: 1.25,
        annualInterestRate: 0.08,
        loanTermMonths: 36,
      });

      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        scenarioType: scenario.type,
        minimumCashCents: projection.summary.minimumCashCents,
        minimumCashDate: projection.summary.minimumCashDate,
        totalPressuredPeriods: projection.summary.totalPressuredPeriods,
        totalShortfallCents: projection.summary.largestShortfallCents,
        maxSafeRepaymentCents: capacity.maxSafeMonthlyRepaymentCents,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Scenario run error:', error);
    return NextResponse.json({ error: 'Failed to run scenarios' }, { status: 500 });
  }
}
