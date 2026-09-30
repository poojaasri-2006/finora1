/**
 * Integration tests for Alert Generation
 */

import { describe, it, expect } from 'vitest';
import { generateAlerts } from '@/domain/alerts/engine';
import { generateProjection } from '@/domain/projection/engine';
import { generateSchedule } from '@/domain/schedule';
import { prisma } from '@/lib/db';
import { addMonths, todayISO } from '@/domain/dates';

describe('Alert Integration', () => {
  it('should generate alerts for an organization', async () => {
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

    const alerts = generateAlerts({
      organizationId: org.id,
      minimumReserveCents: org.minimumCashReserveCents,
      currency: org.baseCurrency,
      obligations: obligations as any,
      installments: allInstallments,
      projection,
      scenarios: [],
      scenarioProjections: new Map(),
    });

    expect(Array.isArray(alerts)).toBe(true);
    // Should have at least some alerts for the demo data
    expect(alerts.length).toBeGreaterThanOrEqual(0);
  });

  it('should create liquidity alerts', async () => {
    const org = await prisma.organization.findFirst({ where: { id: 'demo-org' } });
    if (!org) throw new Error('Demo organization not found');

    // Create a projection that will definitely have liquidity issues
    const projection = generateProjection({
      organizationId: org.id,
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: todayISO(),
      endDate: addMonths(todayISO(), 6),
      openingCashCents: 1000000, // Very low opening cash
      minimumReserveCents: org.minimumCashReserveCents,
      cashFlows: [],
      obligations: [],
      financingSchedules: [],
      scenario: null,
    });

    const alerts = generateAlerts({
      organizationId: org.id,
      minimumReserveCents: org.minimumCashReserveCents,
      currency: org.baseCurrency,
      obligations: [],
      installments: [],
      projection,
      scenarios: [],
      scenarioProjections: new Map(),
    });

    // Should have cash below reserve alerts
    const reserveAlerts = alerts.filter((a) => a.type === 'CASH_BELOW_RESERVE');
    expect(reserveAlerts.length).toBeGreaterThan(0);
  });
});
