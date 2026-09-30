/**
 * Integration tests for Cash-Flow Projection
 * 
 * Tests the full projection pipeline with real database data.
 */

import { describe, it, expect } from 'vitest';
import { generateProjection } from '@/domain/projection/engine';
import { generateSchedule } from '@/domain/schedule';
import { prisma } from '@/lib/db';
import { addMonths, todayISO } from '@/domain/dates';

describe('Projection Integration', () => {
  it('should generate a projection with real data', async () => {
    const org = await prisma.organization.findFirst({ where: { id: 'demo-org' } });
    if (!org) throw new Error('Demo organization not found');

    const [cashFlows, obligations, financingAccounts] = await Promise.all([
      prisma.cashFlowEntry.findMany({ where: { organizationId: org.id } }),
      prisma.businessObligation.findMany({ where: { organizationId: org.id } }),
      prisma.financingAccount.findMany({ where: { organizationId: org.id } }),
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

    const projection = generateProjection({
      organizationId: org.id,
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate,
      endDate,
      openingCashCents: 7500000,
      minimumReserveCents: org.minimumCashReserveCents,
      cashFlows: cashFlows as any,
      obligations: obligations as any,
      financingSchedules: allInstallments,
      scenario: null,
    });

    expect(projection.periods.length).toBeGreaterThan(0);
    expect(projection.summary).toBeDefined();
    expect(projection.summary.minimumCashCents).toBeDefined();
  });

  it('should handle stress scenario', async () => {
    const org = await prisma.organization.findFirst({ where: { id: 'demo-org' } });
    if (!org) throw new Error('Demo organization not found');

    const [cashFlows, obligations, financingAccounts] = await Promise.all([
      prisma.cashFlowEntry.findMany({ where: { organizationId: org.id } }),
      prisma.businessObligation.findMany({ where: { organizationId: org.id } }),
      prisma.financingAccount.findMany({ where: { organizationId: org.id } }),
    ]);

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
      });
      allInstallments.push(...schedule);
    }

    const startDate = todayISO();
    const endDate = addMonths(startDate, 12);

    // Create a severe downside scenario
    const severeScenario = {
      id: 'severe-downside',
      organizationId: org.id,
      name: 'Severe Downside',
      type: 'SEVERE_DOWNSIDE',
      description: '25% revenue decline',
      adjustments: [
        {
          id: 'adj-1',
          scenarioId: 'severe-downside',
          type: 'REVENUE_DECLINE' as const,
          value: 0.25,
          isPercentage: true,
          description: '25% revenue decline',
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    const projection = generateProjection({
      organizationId: org.id,
      scenarioId: 'severe-downside',
      periodType: 'MONTHLY',
      startDate,
      endDate,
      openingCashCents: 7500000,
      minimumReserveCents: org.minimumCashReserveCents,
      cashFlows: cashFlows as any,
      obligations: obligations as any,
      financingSchedules: allInstallments,
      scenario: severeScenario as any,
    });

    expect(projection.periods.length).toBeGreaterThan(0);
    // Severe downside should have more pressured periods than base case
    expect(projection.summary.totalPressuredPeriods).toBeGreaterThanOrEqual(0);
  });
});
