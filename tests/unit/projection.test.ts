/**
 * Unit tests for Cash-Flow Projection Engine
 * 
 * Tests:
 * - Basic projection calculation
 * - Minimum reserve detection
 * - Cash-flow aggregation
 * - Multiple simultaneous loans
 * - Recurring obligations
 */

import { describe, it, expect } from 'vitest';
import { generateProjection } from '@/domain/projection/engine';
import type { CashFlowEntry, BusinessObligation } from '@/domain/types';
import type { ScheduleEntry } from '@/domain/schedule';

describe('Projection Engine', () => {
  it('should generate a basic projection', () => {
    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      openingCashCents: 10000000, // $100,000
      minimumReserveCents: 5000000, // $50,000
      cashFlows: [],
      obligations: [],
      financingSchedules: [],
      scenario: null,
    });

    expect(projection.periods).toHaveLength(3);
    expect(projection.periods[0].openingCashCents).toBe(10000000);
    expect(projection.periods[0].closingCashCents).toBe(10000000);
  });

  it('should detect when cash falls below minimum reserve', () => {
    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      openingCashCents: 6000000, // $60,000
      minimumReserveCents: 5000000, // $50,000
      cashFlows: [
        {
          id: 'cf-1',
          organizationId: 'org-1',
          name: 'Large Expense',
          category: 'ONE_TIME_EXPENSE',
          type: 'OUTFLOW',
          amountCents: 2000000, // $20,000
          recurrence: 'ONE_TIME',
          startDate: '2025-01-15',
          endDate: null,
          expectedDelayDays: 0,
          status: 'PROJECTED',
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      obligations: [],
      financingSchedules: [],
      scenario: null,
    });

    // After the $20,000 expense, cash should be $40,000 which is below $50,000 reserve
    expect(projection.periods[0].isPressured).toBe(true);
    expect(projection.periods[0].cashShortfallCents).toBe(1000000); // $10,000 shortfall
  });

  it('should aggregate multiple cash flows correctly', () => {
    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      openingCashCents: 10000000,
      minimumReserveCents: 5000000,
      cashFlows: [
        {
          id: 'cf-1',
          organizationId: 'org-1',
          name: 'Revenue',
          category: 'REVENUE',
          type: 'INFLOW',
          amountCents: 5000000,
          recurrence: 'MONTHLY',
          startDate: '2025-01-01',
          endDate: null,
          expectedDelayDays: 0,
          status: 'PROJECTED',
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'cf-2',
          organizationId: 'org-1',
          name: 'Expenses',
          category: 'OTHER_RECURRING',
          type: 'OUTFLOW',
          amountCents: 3000000,
          recurrence: 'MONTHLY',
          startDate: '2025-01-01',
          endDate: null,
          expectedDelayDays: 0,
          status: 'PROJECTED',
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      obligations: [],
      financingSchedules: [],
      scenario: null,
    });

    expect(projection.periods[0].inflowsCents).toBe(5000000);
    expect(projection.periods[0].totalOutflowsCents).toBe(3000000);
    expect(projection.periods[0].closingCashCents).toBe(12000000);
  });

  it('should handle multiple financing schedules', () => {
    const installments: ScheduleEntry[] = [
      {
        number: 1,
        dueDate: '2025-01-15',
        openingPrincipalCents: 1000000,
        interestCents: 5000,
        principalRepaymentCents: 50000,
        feesCents: 0,
        totalPaymentCents: 55000,
        closingPrincipalCents: 950000,
      },
      {
        number: 1,
        dueDate: '2025-01-20',
        openingPrincipalCents: 2000000,
        interestCents: 10000,
        principalRepaymentCents: 100000,
        feesCents: 0,
        totalPaymentCents: 110000,
        closingPrincipalCents: 1900000,
      },
    ];

    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      openingCashCents: 10000000,
      minimumReserveCents: 5000000,
      cashFlows: [],
      obligations: [],
      financingSchedules: installments,
      scenario: null,
    });

    expect(projection.periods[0].financingPaymentsCents).toBe(165000);
  });

  it('should calculate debt service coverage ratio', () => {
    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      openingCashCents: 10000000,
      minimumReserveCents: 5000000,
      cashFlows: [
        {
          id: 'cf-1',
          organizationId: 'org-1',
          name: 'Revenue',
          category: 'REVENUE',
          type: 'INFLOW',
          amountCents: 10000000,
          recurrence: 'MONTHLY',
          startDate: '2025-01-01',
          endDate: null,
          expectedDelayDays: 0,
          status: 'PROJECTED',
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      obligations: [],
      financingSchedules: [
        {
          number: 1,
          dueDate: '2025-01-15',
          openingPrincipalCents: 1000000,
          interestCents: 5000,
          principalRepaymentCents: 50000,
          feesCents: 0,
          totalPaymentCents: 55000,
          closingPrincipalCents: 950000,
        },
      ],
      scenario: null,
    });

    // DSCR = Total inflows / Total debt service = 30000000 / 165000 = ~181.8
    expect(projection.summary.debtServiceCoverageRatio).toBeGreaterThan(100);
  });

  it('should handle recurring obligations', () => {
    const obligations: BusinessObligation[] = [
      {
        id: 'ob-1',
        organizationId: 'org-1',
        name: 'Monthly Payroll',
        type: 'PAYROLL',
        amountCents: 5000000,
        dueDate: '2025-01-01',
        recurrence: 'MONTHLY',
        endDate: null,
        status: 'PENDING',
        financingAccountId: null,
        notes: '',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      openingCashCents: 20000000,
      minimumReserveCents: 5000000,
      cashFlows: [],
      obligations,
      financingSchedules: [],
      scenario: null,
    });

    // Payroll should appear in each month
    expect(projection.periods[0].payrollCents).toBe(5000000);
    expect(projection.periods[1].payrollCents).toBe(5000000);
    expect(projection.periods[2].payrollCents).toBe(5000000);
  });

  it('should identify first shortage date', () => {
    const projection = generateProjection({
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      openingCashCents: 6000000,
      minimumReserveCents: 5000000,
      cashFlows: [
        {
          id: 'cf-1',
          organizationId: 'org-1',
          name: 'Large Expense',
          category: 'ONE_TIME_EXPENSE',
          type: 'OUTFLOW',
          amountCents: 2000000,
          recurrence: 'ONE_TIME',
          startDate: '2025-03-01',
          endDate: null,
          expectedDelayDays: 0,
          status: 'PROJECTED',
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      obligations: [],
      financingSchedules: [],
      scenario: null,
    });

    // March should be the first shortage (60000 - 20000 = 40000 < 50000)
    expect(projection.summary.firstShortageDate).toBe('2025-03-01');
  });
});
