/**
 * Maximum Safe Borrowing Capacity Calculator
 * 
 * Estimates how much additional debt an organization can safely take on
 * without breaching its minimum cash reserve under a given scenario.
 * 
 * This is NOT financial advice. It is a transparent calculation based on
 * user-defined assumptions.
 * 
 * Formula:
 *   Max safe monthly repayment = (Average monthly inflows - Average monthly outflows - Minimum reserve buffer) / Safety factor
 *   Max affordable loan amount = Max safe monthly repayment × [1 - (1 + r)^-n] / r
 *   Required cash reserve = User-defined minimum
 *   DSCR = Total inflows / Total debt service
 */

import type { Cents, ProjectionResult, Scenario } from '../types';
import { formatMoney } from '../money';

export interface SafeBorrowingParams {
  projection: ProjectionResult;
  scenario: Scenario;
  minimumReserveCents: Cents;
  projectionMonths: number;
  stressLevel: number; // 0-1, where 1 = severe stress
  requiredCoverageRatio: number; // e.g., 1.25 means 125% coverage
  annualInterestRate: number; // For new loan
  loanTermMonths: number;
}

export interface SafeBorrowingResult {
  maxSafeMonthlyRepaymentCents: Cents;
  maxAffordableLoanAmountCents: Cents;
  requiredCashReserveCents: Cents;
  debtServiceCoverageRatio: number;
  isSafe: boolean;
  assumptions: string[];
  warnings: string[];
}

/**
 * Calculate maximum safe borrowing capacity.
 */
export function calculateSafeBorrowingCapacity(params: SafeBorrowingParams): SafeBorrowingResult {
  const {
    projection,
    scenario,
    minimumReserveCents,
    projectionMonths,
    stressLevel,
    requiredCoverageRatio,
    annualInterestRate,
    loanTermMonths,
  } = params;

  const assumptions: string[] = [];
  const warnings: string[] = [];

  // Calculate average monthly inflows and outflows from projection
  const periods = projection.periods;
  if (periods.length === 0) {
    return {
      maxSafeMonthlyRepaymentCents: 0,
      maxAffordableLoanAmountCents: 0,
      requiredCashReserveCents: minimumReserveCents,
      debtServiceCoverageRatio: 0,
      isSafe: false,
      assumptions: ['No projection data available'],
      warnings: ['Cannot calculate capacity without projection data'],
    };
  }

  const totalInflows = periods.reduce((sum, p) => sum + p.inflowsCents, 0);
  const totalOutflows = periods.reduce((sum, p) => sum + p.totalOutflowsCents, 0);
  const avgMonthlyInflows = totalInflows / periods.length;
  const avgMonthlyOutflows = totalOutflows / periods.length;

  assumptions.push(`Average monthly inflows: ${formatMoney(Math.round(avgMonthlyInflows), projection.periods[0] ? 'USD' : 'USD')}`);
  assumptions.push(`Average monthly outflows: ${formatMoney(Math.round(avgMonthlyOutflows), 'USD')}`);

  // Apply stress level to inflows
  const stressedInflows = avgMonthlyInflows * (1 - stressLevel);
  assumptions.push(`Stress level: ${Math.round(stressLevel * 100)}% reduction in inflows`);

  // Calculate available cash for debt service
  // Available = Stressed inflows - Outflows - Minimum reserve buffer
  const minimumReserveMonthly = minimumReserveCents / projectionMonths;
  const availableForDebtService = stressedInflows - avgMonthlyOutflows - minimumReserveMonthly;

  if (availableForDebtService <= 0) {
    warnings.push('Current cash flows do not support any additional debt service.');
    return {
      maxSafeMonthlyRepaymentCents: 0,
      maxAffordableLoanAmountCents: 0,
      requiredCashReserveCents: minimumReserveCents,
      debtServiceCoverageRatio: 0,
      isSafe: false,
      assumptions,
      warnings,
    };
  }

  // Apply required coverage ratio
  // DSCR = (Available for debt service) / (New debt service) >= requiredCoverageRatio
  // Therefore: New debt service <= Available / requiredCoverageRatio
  const maxSafeMonthlyRepayment = Math.round(availableForDebtService / requiredCoverageRatio);

  assumptions.push(`Required coverage ratio: ${requiredCoverageRatio}x`);
  assumptions.push(`Maximum safe monthly repayment: ${formatMoney(maxSafeMonthlyRepayment, 'USD')}`);

  // Calculate maximum affordable loan amount
  // Using present value of annuity formula:
  // PV = PMT × [1 - (1 + r)^-n] / r
  const r = annualInterestRate / 12;
  const n = loanTermMonths;

  let maxAffordableLoanAmount: Cents;
  if (r === 0) {
    maxAffordableLoanAmount = maxSafeMonthlyRepayment * n;
  } else {
    const discountFactor = (1 - Math.pow(1 + r, -n)) / r;
    maxAffordableLoanAmount = Math.round(maxSafeMonthlyRepayment * discountFactor);
  }

  assumptions.push(`Assumed interest rate: ${(annualInterestRate * 100).toFixed(2)}%`);
  assumptions.push(`Assumed loan term: ${loanTermMonths} months`);
  assumptions.push(`Maximum affordable loan amount: ${formatMoney(maxAffordableLoanAmount, 'USD')}`);

  // Calculate DSCR under this scenario
  const totalDebtService = periods.reduce((sum, p) => sum + p.financingPaymentsCents, 0) + maxSafeMonthlyRepayment * periods.length;
  const dscr = totalDebtService > 0 ? (totalInflows / totalDebtService) : Infinity;

  assumptions.push(`Projected DSCR: ${dscr.toFixed(2)}x`);

  // Check if safe
  const isSafe = dscr >= requiredCoverageRatio && maxSafeMonthlyRepayment > 0;

  if (!isSafe) {
    warnings.push('The calculated borrowing capacity does not meet the required coverage ratio.');
  }

  if (projection.summary.totalPressuredPeriods > 0) {
    warnings.push('The base projection already shows liquidity pressure. Additional borrowing is not recommended.');
  }

  return {
    maxSafeMonthlyRepaymentCents: maxSafeMonthlyRepayment,
    maxAffordableLoanAmountCents: maxAffordableLoanAmount,
    requiredCashReserveCents: minimumReserveCents,
    debtServiceCoverageRatio: dscr,
    isSafe,
    assumptions,
    warnings,
  };
}
