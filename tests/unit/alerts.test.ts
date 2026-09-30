/**
 * Unit tests for Alert Engine
 */

import { describe, it, expect } from 'vitest';
import { generateAlerts } from '@/domain/alerts/engine';
import type { BusinessObligation, ScheduleInstallment, ProjectionResult } from '@/domain/types';

describe('Alert Engine', () => {
  it('should generate alert for repayment due within 7 days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const installments: ScheduleInstallment[] = [
      {
        id: 'inst-1',
        financingAccountId: 'loan-1',
        organizationId: 'org-1',
        number: 1,
        dueDate: fiveDaysFromNow,
        openingPrincipalCents: 1000000,
        interestCents: 5000,
        principalRepaymentCents: 50000,
        feesCents: 0,
        totalPaymentCents: 55000,
        closingPrincipalCents: 950000,
        status: 'PENDING',
        paidDate: null,
        paidAmountCents: 0,
        createdAt: '',
      },
    ];

    const alerts = generateAlerts({
      organizationId: 'org-1',
      minimumReserveCents: 5000000,
      currency: 'USD',
      obligations: [],
      installments,
      projection: null,
      scenarios: [],
      scenarioProjections: new Map(),
    });

    const repaymentAlerts = alerts.filter((a) => a.type === 'REPAYMENT_DUE_7_DAYS');
    expect(repaymentAlerts.length).toBeGreaterThan(0);
  });

  it('should generate critical alert for overdue installment', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const installments: ScheduleInstallment[] = [
      {
        id: 'inst-1',
        financingAccountId: 'loan-1',
        organizationId: 'org-1',
        number: 1,
        dueDate: yesterday,
        openingPrincipalCents: 1000000,
        interestCents: 5000,
        principalRepaymentCents: 50000,
        feesCents: 0,
        totalPaymentCents: 55000,
        closingPrincipalCents: 950000,
        status: 'PENDING',
        paidDate: null,
        paidAmountCents: 0,
        createdAt: '',
      },
    ];

    const alerts = generateAlerts({
      organizationId: 'org-1',
      minimumReserveCents: 5000000,
      currency: 'USD',
      obligations: [],
      installments,
      projection: null,
      scenarios: [],
      scenarioProjections: new Map(),
    });

    const overdueAlerts = alerts.filter((a) => a.type === 'OVERDUE_INSTALLMENT');
    expect(overdueAlerts.length).toBe(1);
    expect(overdueAlerts[0].severity).toBe('CRITICAL');
  });

  it('should generate alert for cash below reserve', () => {
    const projection: ProjectionResult = {
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      periods: [
        {
          periodStart: '2025-01-01',
          periodEnd: '2025-01-31',
          openingCashCents: 6000000,
          inflowsCents: 0,
          operatingExpensesCents: 0,
          payrollCents: 0,
          taxesCents: 0,
          vendorPaymentsCents: 0,
          financingPaymentsCents: 2000000,
          otherOutflowsCents: 0,
          totalOutflowsCents: 2000000,
          closingCashCents: 4000000,
          minimumReserveCents: 5000000,
          liquidityBufferCents: -1000000,
          cashShortfallCents: 1000000,
          isPressured: true,
        },
      ],
      summary: {
        minimumCashCents: 4000000,
        minimumCashDate: '2025-01-01',
        lowestCashCents: 4000000,
        largestShortfallCents: 1000000,
        totalPressuredPeriods: 1,
        totalDebtServiceCents: 2000000,
        debtServiceCoverageRatio: null,
        firstShortageDate: '2025-01-01',
      },
      generatedAt: '',
    };

    const alerts = generateAlerts({
      organizationId: 'org-1',
      minimumReserveCents: 5000000,
      currency: 'USD',
      obligations: [],
      installments: [],
      projection,
      scenarios: [],
      scenarioProjections: new Map(),
    });

    const reserveAlerts = alerts.filter((a) => a.type === 'CASH_BELOW_RESERVE');
    expect(reserveAlerts.length).toBeGreaterThan(0);
    expect(reserveAlerts[0].severity).toBe('CRITICAL');
  });

  it('should generate alert for large obligation due within 30 days', () => {
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const obligations: BusinessObligation[] = [
      {
        id: 'ob-1',
        organizationId: 'org-1',
        name: 'Large Tax Payment',
        type: 'TAX',
        amountCents: 2000000, // $20,000 (more than 20% of $50,000 reserve)
        dueDate: fifteenDaysFromNow,
        recurrence: 'ONE_TIME',
        endDate: null,
        status: 'PENDING',
        financingAccountId: null,
        notes: '',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const alerts = generateAlerts({
      organizationId: 'org-1',
      minimumReserveCents: 5000000,
      currency: 'USD',
      obligations,
      installments: [],
      projection: null,
      scenarios: [],
      scenarioProjections: new Map(),
    });

    const largeObligationAlerts = alerts.filter((a) => a.type === 'LARGE_OBLIGATION_30_DAYS');
    expect(largeObligationAlerts.length).toBe(1);
  });
});
