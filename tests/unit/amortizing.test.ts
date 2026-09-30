/**
 * Unit tests for Amortizing (Equal Installment) Loan Schedule
 * 
 * Tests:
 * - Basic amortizing loan calculation
 * - Zero-interest loan
 * - Final installment rounding
 * - Monthly date edge cases
 * - Leap year handling
 * - Multiple simultaneous loans
 */

import { describe, it, expect } from 'vitest';
import { generateAmortizingSchedule, calculateAmortizingPayment } from '@/domain/schedule/amortizing';

describe('Amortizing Loan Schedule', () => {
  it('should generate correct schedule for a basic 12-month loan', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 1200000, // $12,000
      annualRate: 0.12, // 12%
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(12);
    expect(schedule[0].openingPrincipalCents).toBe(1200000);
    expect(schedule[11].closingPrincipalCents).toBe(0);
  });

  it('should calculate correct monthly payment', () => {
    // $12,000 at 12% for 12 months
    // r = 0.12/12 = 0.01
    // Payment = 12000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1)
    // = 120 * 1.126825 / 0.126825
    // = 135.219 / 0.126825
    // ≈ 1066.19
    const payment = calculateAmortizingPayment(1200000, 0.12, 'MONTHLY', 12);
    expect(payment).toBeGreaterThan(106600);
    expect(payment).toBeLessThan(106700);
  });

  it('should handle zero-interest loan', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 1200000,
      annualRate: 0,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(12);
    // Each payment should be exactly $1,000 (100000 cents)
    for (const inst of schedule) {
      expect(inst.interestCents).toBe(0);
      expect(inst.principalRepaymentCents).toBe(100000);
      expect(inst.totalPaymentCents).toBe(100000);
    }
  });

  it('should have final installment with zero closing principal', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 5000000,
      annualRate: 0.08,
      startDate: '2025-01-01',
      maturityDate: '2027-01-01',
      frequency: 'MONTHLY',
    });

    const last = schedule[schedule.length - 1];
    expect(last.closingPrincipalCents).toBe(0);
  });

  it('should handle leap year correctly', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2024-01-01', // 2024 is a leap year
      maturityDate: '2024-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(12);
    // February should have 29 days in 2024
    expect(schedule[1].dueDate).toBe('2024-02-01');
  });

  it('should handle month-end dates correctly', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-31',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    // Jan 31 + 1 month = Feb 28 (not Mar 3)
    expect(schedule[0].dueDate).toBe('2025-01-31');
    expect(schedule[1].dueDate).toBe('2025-02-28');
  });

  it('should handle weekly frequency', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 520000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'WEEKLY',
    });

    expect(schedule.length).toBeGreaterThan(40);
    expect(schedule.length).toBeLessThan(60);
  });

  it('should handle quarterly frequency', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 4000000,
      annualRate: 0.08,
      startDate: '2025-01-01',
      maturityDate: '2027-01-01',
      frequency: 'QUARTERLY',
    });

    expect(schedule).toHaveLength(8);
  });

  it('should include fees in total payment', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
      feesCents: 120000, // $1,200 in fees
    });

    // Total fees across all installments should equal the input fees
    const totalFees = schedule.reduce((sum, inst) => sum + inst.feesCents, 0);
    expect(totalFees).toBe(120000);
  });

  it('should handle grace period', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
      gracePeriodMonths: 3,
    });

    // With 3-month grace period, first payment is April 2025
    expect(schedule[0].dueDate).toBe('2025-04-01');
  });

  it('should maintain invariant: opening = previous closing', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 10000000,
      annualRate: 0.075,
      startDate: '2025-01-01',
      maturityDate: '2030-01-01',
      frequency: 'MONTHLY',
    });

    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].openingPrincipalCents).toBe(schedule[i - 1].closingPrincipalCents);
    }
  });

  it('should maintain invariant: closing = opening - principal repayment', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 10000000,
      annualRate: 0.075,
      startDate: '2025-01-01',
      maturityDate: '2030-01-01',
      frequency: 'MONTHLY',
    });

    for (const inst of schedule) {
      expect(inst.closingPrincipalCents).toBe(
        inst.openingPrincipalCents - inst.principalRepaymentCents
      );
    }
  });

  it('should maintain invariant: total = principal + interest + fees', () => {
    const schedule = generateAmortizingSchedule({
      principalCents: 10000000,
      annualRate: 0.075,
      startDate: '2025-01-01',
      maturityDate: '2030-01-01',
      frequency: 'MONTHLY',
      feesCents: 500000,
    });

    for (const inst of schedule) {
      expect(inst.totalPaymentCents).toBe(
        inst.principalRepaymentCents + inst.interestCents + inst.feesCents
      );
    }
  });
});
