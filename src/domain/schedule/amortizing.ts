/**
 * Amortizing (Equal Installment) Loan Schedule
 * 
 * Payment formula:
 *   Payment = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * 
 * Where:
 *   P = principal
 *   r = periodic interest rate (annual rate / periods per year)
 *   n = number of payments
 * 
 * Rounding rules:
 * - Each installment's interest is rounded to nearest cent.
 * - The final installment absorbs any residual rounding difference.
 * - Closing principal of final installment must be exactly 0.
 */

import type { Cents, ISODate } from '../types';
import { addMonths, addWeeks, periodsPerYear } from '../dates';
import { roundCents } from '../money';

export interface AmortizingParams {
  principalCents: Cents;
  annualRate: number; // e.g., 0.075 for 7.5%
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
 * Calculate the fixed periodic payment amount for an amortizing loan.
 */
export function calculateAmortizingPayment(
  principalCents: Cents,
  annualRate: number,
  frequency: string,
  numPayments: number,
): Cents {
  if (numPayments <= 0) return 0;
  if (annualRate === 0) return roundCents(principalCents / numPayments);

  const r = annualRate / periodsPerYear(frequency);
  const n = numPayments;

  // Payment = P × r × (1 + r)^n / ((1 + r)^n - 1)
  const onePlusRN = Math.pow(1 + r, n);
  const payment = principalCents * r * onePlusRN / (onePlusRN - 1);

  return roundCents(payment);
}

/**
 * Generate a full amortizing loan schedule.
 */
export function generateAmortizingSchedule(params: AmortizingParams): ScheduleEntry[] {
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

  // Calculate fixed payment amount
  const regularPayment = calculateAmortizingPayment(principalCents, annualRate, frequency, numPayments);

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
      ? remainingFees // Last installment gets remaining fees
      : roundCents(feesCents / numPayments);
    remainingFees -= fees;

    // For the final installment, adjust to ensure closing principal = 0
    let principalRepayment: Cents;
    let totalPayment: Cents;

    if (isLast) {
      // Final installment: principal repayment = remaining opening principal
      principalRepayment = openingPrincipal;
      totalPayment = principalRepayment + interest + fees;
    } else {
      // Regular installment
      principalRepayment = regularPayment - interest - fees;
      // Ensure we don't overpay
      if (principalRepayment > openingPrincipal) {
        principalRepayment = openingPrincipal;
      }
      totalPayment = principalRepayment + interest + fees;
    }

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

/**
 * Calculate the number of payments between start and maturity dates.
 */
function calculateNumberOfPayments(
  startDate: ISODate,
  maturityDate: ISODate,
  frequency: string,
  gracePeriodMonths: number,
): number {
  // Start counting after grace period
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
      // If we've passed the day-of-month, count this month
      if (end.getUTCDate() > start.getUTCDate()) months += 1;
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

/**
 * Generate due dates for each installment.
 */
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
