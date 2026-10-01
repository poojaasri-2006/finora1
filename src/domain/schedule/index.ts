/**
 * Schedule Engine — generates repayment schedules for all loan types.
 * 
 * Supports:
 * - Amortizing (equal installment)
 * - Equal principal
 * - Interest-only
 * - Bullet (single payment at maturity)
 * 
 * All calculations use exact integer cents arithmetic.
 */

import type { Cents, ISODate, RepaymentMethod, PaymentFrequency } from '../types';
import { generateAmortizingSchedule } from './amortizing';
import { generateEqualPrincipalSchedule } from './equal-principal';
import { generateInterestOnlySchedule } from './interest-only';
import { generateBulletSchedule } from './bullet';

export interface ScheduleParams {
  principalCents: Cents;
  annualRate: number;
  startDate: ISODate;
  maturityDate: ISODate;
  frequency: PaymentFrequency;
  repaymentMethod: RepaymentMethod;
  feesCents?: Cents;
  gracePeriodMonths?: number;
}

export interface ScheduleEntry {
  financingAccountId?: string;
  number: number;
  dueDate: ISODate;
  openingPrincipalCents: Cents;
  interestCents: Cents;
  principalRepaymentCents: Cents;
  feesCents: Cents;
  totalPaymentCents: Cents;
  closingPrincipalCents: Cents;
}

/**
 * Generate a repayment schedule based on the repayment method.
 */
export function generateSchedule(params: ScheduleParams): ScheduleEntry[] {
  const { repaymentMethod } = params;

  switch (repaymentMethod) {
    case 'AMORTIZING':
      return generateAmortizingSchedule(params);
    case 'EQUAL_PRINCIPAL':
      return generateEqualPrincipalSchedule(params);
    case 'INTEREST_ONLY':
      return generateInterestOnlySchedule(params);
    case 'BULLET':
      return generateBulletSchedule(params);
    default:
      throw new Error(`Unknown repayment method: ${repaymentMethod}`);
  }
}

/**
 * Calculate the total payment amount for a loan (for display purposes).
 */
export function calculateTotalPayment(params: ScheduleParams): Cents {
  const schedule = generateSchedule(params);
  return schedule.reduce((sum, inst) => sum + inst.totalPaymentCents, 0);
}

/**
 * Calculate total interest over the life of a loan.
 */
export function calculateTotalInterest(params: ScheduleParams): Cents {
  const schedule = generateSchedule(params);
  return schedule.reduce((sum, inst) => sum + inst.interestCents, 0);
}

/**
 * Get the next pending installment from a schedule.
 */
export function getNextInstallment(schedule: ScheduleEntry[]): ScheduleEntry | null {
  return schedule.find(inst => inst.closingPrincipalCents > 0 || inst.number === schedule.length) ?? null;
}

export { generateAmortizingSchedule } from './amortizing';
export { generateEqualPrincipalSchedule } from './equal-principal';
export { generateInterestOnlySchedule } from './interest-only';
export { generateBulletSchedule } from './bullet';
