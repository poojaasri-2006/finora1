/**
 * Bullet Loan Schedule
 * 
 * A single payment at maturity that includes all principal + all interest + fees.
 * No interim payments.
 * 
 * Interest = Principal × annual rate × (days in term / 365)
 * Or for simplicity: Principal × periodic rate × number of periods
 * 
 * Rounding rules:
 * - Interest is rounded to nearest cent.
 * - Single installment at maturity date.
 */

import type { Cents, ISODate } from '../types';
import { addMonths, addWeeks, periodsPerYear, daysBetween } from '../dates';
import { roundCents } from '../money';

export interface BulletParams {
  principalCents: Cents;
  annualRate: number;
  startDate: ISODate;
  maturityDate: ISODate;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  feesCents?: Cents;
  gracePeriodMonths?: number;
}

export interface ScheduleEntry {
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
 * Generate a bullet loan schedule (single payment at maturity).
 */
export function generateBulletSchedule(params: BulletParams): ScheduleEntry[] {
  const {
    principalCents,
    annualRate,
    startDate,
    maturityDate,
    frequency,
    feesCents = 0,
    gracePeriodMonths = 0,
  } = params;

  const effectiveStart = gracePeriodMonths > 0
    ? addMonths(startDate, gracePeriodMonths)
    : startDate;

  // Calculate total interest over the life of the loan
  // Using simple interest: Principal × rate × time
  const totalDays = daysBetween(effectiveStart, maturityDate);
  const years = totalDays / 365;
  const totalInterest = roundCents(principalCents * annualRate * years);

  // Single installment at maturity
  const totalPayment = principalCents + totalInterest + feesCents;

  return [
    {
      number: 1,
      dueDate: maturityDate,
      openingPrincipalCents: principalCents,
      interestCents: totalInterest,
      principalRepaymentCents: principalCents,
      feesCents: feesCents,
      totalPaymentCents: totalPayment,
      closingPrincipalCents: 0,
    },
  ];
}
