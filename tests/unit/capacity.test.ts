/**
 * Unit tests for Safe Borrowing Capacity Calculator
 */

import { describe, it, expect } from 'vitest';
import { calculateSafeBorrowingCapacity } from '@/domain/capacity/safe-borrowing';
import type { ProjectionResult, Scenario } from '@/domain/types';

describe('Safe Borrowing Capacity', () => {
  it('should calculate positive capacity when cash flows are strong', () => {
    const projection: ProjectionResult = {
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      periods: Array.from({ length: 12 }, (_, i) => ({
        periodStart: `2025-${String(i + 1).padStart(2, '0')}-01`,
        periodEnd: `2025-${String(i + 1).padStart(2, '0')}-28`,
        openingCashCents: 10000000,
        inflowsCents: 10000000,
        operatingExpensesCents: 5000000,
        payrollCents: 0,
        taxesCents: 0,
        vendorPaymentsCents: 0,
        financingPaymentsCents: 1000000,
        otherOutflowsCents: 0,
        totalOutflowsCents: 6000000,
        closingCashCents: 14000000,
        minimumReserveCents: 5000000,
        liquidityBufferCents: 9000000,
        cashShortfallCents: 0,
        isPressured: false,
      })),
      summary: {
        minimumCashCents: 10000000,
        minimumCashDate: '2025-01-01',
        lowestCashCents: 10000000,
        largestShortfallCents: 0,
        totalPressuredPeriods: 0,
        totalDebtServiceCents: 12000000,
        debtServiceCoverageRatio: 1.0,
        firstShortageDate: null,
      },
      generatedAt: '',
    };

    const scenario: Scenario = {
      id: 'base',
      organizationId: 'org-1',
      name: 'Base Case',
      type: 'BASE',
      description: '',
      adjustments: [],
      createdAt: '',
      updatedAt: '',
    };

    const result = calculateSafeBorrowingCapacity({
      projection,
      scenario,
      minimumReserveCents: 5000000,
      projectionMonths: 12,
      stressLevel: 0,
      requiredCoverageRatio: 1.25,
      annualInterestRate: 0.08,
      loanTermMonths: 36,
    });

    expect(result.maxSafeMonthlyRepaymentCents).toBeGreaterThan(0);
    expect(result.maxAffordableLoanAmountCents).toBeGreaterThan(0);
    expect(result.isSafe).toBe(true);
  });

  it('should return zero capacity when cash flows are weak', () => {
    const projection: ProjectionResult = {
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      periods: Array.from({ length: 12 }, (_, i) => ({
        periodStart: `2025-${String(i + 1).padStart(2, '0')}-01`,
        periodEnd: `2025-${String(i + 1).padStart(2, '0')}-28`,
        openingCashCents: 5000000,
        inflowsCents: 5000000,
        operatingExpensesCents: 5000000,
        payrollCents: 0,
        taxesCents: 0,
        vendorPaymentsCents: 0,
        financingPaymentsCents: 1000000,
        otherOutflowsCents: 0,
        totalOutflowsCents: 6000000,
        closingCashCents: 4000000,
        minimumReserveCents: 5000000,
        liquidityBufferCents: -1000000,
        cashShortfallCents: 1000000,
        isPressured: true,
      })),
      summary: {
        minimumCashCents: 4000000,
        minimumCashDate: '2025-01-01',
        lowestCashCents: 4000000,
        largestShortfallCents: 1000000,
        totalPressuredPeriods: 12,
        totalDebtServiceCents: 12000000,
        debtServiceCoverageRatio: 0.42,
        firstShortageDate: '2025-01-01',
      },
      generatedAt: '',
    };

    const scenario: Scenario = {
      id: 'base',
      organizationId: 'org-1',
      name: 'Base Case',
      type: 'BASE',
      description: '',
      adjustments: [],
      createdAt: '',
      updatedAt: '',
    };

    const result = calculateSafeBorrowingCapacity({
      projection,
      scenario,
      minimumReserveCents: 5000000,
      projectionMonths: 12,
      stressLevel: 0,
      requiredCoverageRatio: 1.25,
      annualInterestRate: 0.08,
      loanTermMonths: 36,
    });

    expect(result.maxSafeMonthlyRepaymentCents).toBe(0);
    expect(result.isSafe).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should apply stress level to reduce capacity', () => {
    const baseProjection: ProjectionResult = {
      organizationId: 'org-1',
      scenarioId: 'base',
      periodType: 'MONTHLY',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      periods: Array.from({ length: 12 }, (_, i) => ({
        periodStart: `2025-${String(i + 1).padStart(2, '0')}-01`,
        periodEnd: `2025-${String(i + 1).padStart(2, '0')}-28`,
        openingCashCents: 10000000,
        inflowsCents: 10000000,
        operatingExpensesCents: 5000000,
        payrollCents: 0,
        taxesCents: 0,
        vendorPaymentsCents: 0,
        financingPaymentsCents: 1000000,
        otherOutflowsCents: 0,
        totalOutflowsCents: 6000000,
        closingCashCents: 14000000,
        minimumReserveCents: 5000000,
        liquidityBufferCents: 9000000,
        cashShortfallCents: 0,
        isPressured: false,
      })),
      summary: {
        minimumCashCents: 10000000,
        minimumCashDate: '2025-01-01',
        lowestCashCents: 10000000,
        largestShortfallCents: 0,
        totalPressuredPeriods: 0,
        totalDebtServiceCents: 12000000,
        debtServiceCoverageRatio: 1.0,
        firstShortageDate: null,
      },
      generatedAt: '',
    };

    const scenario: Scenario = {
      id: 'base',
      organizationId: 'org-1',
      name: 'Base Case',
      type: 'BASE',
      description: '',
      adjustments: [],
      createdAt: '',
      updatedAt: '',
    };

    const noStress = calculateSafeBorrowingCapacity({
      projection: baseProjection,
      scenario,
      minimumReserveCents: 5000000,
      projectionMonths: 12,
      stressLevel: 0,
      requiredCoverageRatio: 1.25,
      annualInterestRate: 0.08,
      loanTermMonths: 36,
    });

    const withStress = calculateSafeBorrowingCapacity({
      projection: baseProjection,
      scenario,
      minimumReserveCents: 5000000,
      projectionMonths: 12,
      stressLevel: 0.25,
      requiredCoverageRatio: 1.25,
      annualInterestRate: 0.08,
      loanTermMonths: 36,
    });

    expect(withStress.maxSafeMonthlyRepaymentCents).toBeLessThan(noStress.maxSafeMonthlyRepaymentCents);
  });
});
