/**
 * Equal Principal Loan Schedule
 * 
 * Each installment repays an equal amount of principal.
 * Interest declines over time because it's calculated on the declining balance.
 * 
 * Principal repayment per installment = Total principal / number of payments
 * Interest = Opening principal × periodic rate
 * Total payment = Principal repayment + Interest + Fees
 * 
 * Rounding rules:
 * - Principal repayment is rounded to nearest cent.
 * - Final installment absorbs residual principal.
 * - Closing principal of final installment = 0.
 */

import type { Cents, ISODate } from '../types';
import { addMonths, addWeeks, periodsPerYear } from '../dates';
import { roundCents } from '../money';

export interface EqualPrincipalParams {
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
 * Generate an equal principal loan schedule.
 */
export function generateEqualPrincipalSchedule(params: EqualPrincipalParams): ScheduleEntry[] {
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

  // Calculate number of payments
  const numPayments = calculateNumberOfPayments(startDate, maturityDate, frequency, gracePeriodMonths);

  if (numPayments <= 0) return [];

  // Equal principal repayment per installment
  const regularPrincipalPayment = roundCents(principalCents / numPayments);

  const installments: ScheduleEntry[] = [];
  let openingPrincipal = principalCents;
  let remainingFees = feesCents;

  // Generate due dates
  const dueDates = generateDueDates(startDate, maturityDate, frequency, numPayments, gracePeriodMonths);

  for (let i = 0; i < numPayments; i++) {
    const isLast = i === numPayments - 1;
    const dueDate = dueDates[i];

    // Interest = opening principal × periodic rate
    const interest = roundCents(openingPrincipal * r);

    // Fees are spread evenly across installments
    const fees = isLast
      ? remainingFees
      : roundCents(feesCents / numPayments);
    remainingFees -= fees;

    // Principal repayment
    let principalRepayment: Cents;
    if (isLast) {
      // Final installment: repay all remaining principal
      principalRepayment = openingPrincipal;
    } else {
      principalRepayment = Math.min(regularPrincipalPayment, openingPrincipal);
    }

    const totalPayment = principalRepayment + interest + fees;
    const closingPrincipal = openingPrincipal - principalRepayment;

    installments.push({
      number: i + 1,
      dueDate,
      openingPrincipalCents: openingPrincipal,
      interestCents: interest,
      principalRepaymentCents: principalRepayment,
      feesCents: fees,
      totalPaymentCents: totalPayment,
      closingPrincipalCents: Math.max(0, closingPrincipal),
    });

    openingPrincipal = closingPrincipal;
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
