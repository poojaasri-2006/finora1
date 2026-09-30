/**
 * Interest-Only Loan Schedule
 * 
 * Each installment pays only the interest. The full principal is repaid at maturity.
 * 
 * Interest per installment = Principal × periodic rate
 * Principal repayment = 0 (except final installment)
 * Final installment = Principal + final interest + fees
 * 
 * Rounding rules:
 * - Interest is rounded to nearest cent.
 * - Final installment absorbs residual rounding.
 */

import type { Cents, ISODate } from '../types';
import { addMonths, addWeeks, periodsPerYear } from '../dates';
import { roundCents } from '../money';

export interface InterestOnlyParams {
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
 * Generate an interest-only loan schedule.
 */
export function generateInterestOnlySchedule(params: InterestOnlyParams): ScheduleEntry[] {
  const {
    principalCents,
    annualRate,
    startDate,
    maturityDate,
    frequency,
    feesCents = 0,
    gracePeriodMonths = 0,
  } = params;

  const ppy = periodsPerYear(frequency);
  const r = annualRate / ppy;

  const numPayments = calculateNumberOfPayments(startDate, maturityDate, frequency, gracePeriodMonths);

  if (numPayments <= 0) return [];

  const installments: ScheduleEntry[] = [];
  let remainingFees = feesCents;

  const dueDates = generateDueDates(startDate, maturityDate, frequency, numPayments, gracePeriodMonths);

  for (let i = 0; i < numPayments; i++) {
    const isLast = i === numPayments - 1;
    const dueDate = dueDates[i];

    // Interest = principal × periodic rate (principal stays constant)
    const interest = roundCents(principalCents * r);

    // Fees are spread evenly across installments
    const fees = isLast
      ? remainingFees
      : roundCents(feesCents / numPayments);
    remainingFees -= fees;

    // Principal repayment: 0 for all except final installment
    const principalRepayment = isLast ? principalCents : 0;
    const totalPayment = principalRepayment + interest + fees;
    const closingPrincipal = isLast ? 0 : principalCents;

    installments.push({
      number: i + 1,
      dueDate,
      openingPrincipalCents: principalCents,
      interestCents: interest,
      principalRepaymentCents: principalRepayment,
      feesCents: fees,
      totalPaymentCents: totalPayment,
      closingPrincipalCents: closingPrincipal,
    });
  }

  return installments;
}

function calculateNumberOfPayments(
  startDate: ISODate,
  maturityDate: ISODate,
  frequency: string,
  gracePeriodMonths: number,
): number {
  const effectiveStart = gracePeriodMonths > 0
    ? addMonths(startDate, gracePeriodMonths)
    : startDate;

  const startTime = new Date(effectiveStart + 'T00:00:00Z').getTime();
  const endTime = new Date(maturityDate + 'T00:00:00Z').getTime();

  if (startTime >= endTime) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;

  switch (frequency) {
    case 'WEEKLY':
      return Math.ceil((endTime - startTime) / (7 * msPerDay));
    case 'BIWEEKLY':
      return Math.ceil((endTime - startTime) / (14 * msPerDay));
    case 'MONTHLY': {
      const start = new Date(effectiveStart + 'T00:00:00Z');
      const end = new Date(maturityDate + 'T00:00:00Z');
      let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (end.getUTCMonth() - start.getUTCMonth());
      if (end.getUTCDate() >= start.getUTCDate()) months += 1;
      return Math.max(0, months);
    }
    case 'QUARTERLY': {
      const months = calculateNumberOfPayments(effectiveStart, maturityDate, 'MONTHLY', 0);
      return Math.ceil(months / 3);
    }
    case 'ANNUAL': {
      const start = new Date(effectiveStart + 'T00:00:00Z');
      const end = new Date(maturityDate + 'T00:00:00Z');
      return Math.max(0, end.getUTCFullYear() - start.getUTCFullYear());
    }
    default:
      return 0;
  }
}

function generateDueDates(
  startDate: ISODate,
  maturityDate: ISODate,
  frequency: string,
  numPayments: number,
  gracePeriodMonths: number,
): ISODate[] {
  const dates: ISODate[] = [];
  let current = gracePeriodMonths > 0
    ? addMonths(startDate, gracePeriodMonths)
    : startDate;

  for (let i = 0; i < numPayments; i++) {
    dates.push(current);
    switch (frequency) {
      case 'WEEKLY':
        current = addWeeks(current, 1);
        break;
      case 'BIWEEKLY':
        current = addWeeks(current, 2);
        break;
      case 'MONTHLY':
        current = addMonths(current, 1);
        break;
      case 'QUARTERLY':
        current = addMonths(current, 3);
        break;
      case 'ANNUAL':
        current = addMonths(current, 12);
        break;
    }
  }

  return dates;
}
