/**
 * Unit tests for Interest-Only Loan Schedule
 */

import { describe, it, expect } from 'vitest';
import { generateInterestOnlySchedule } from '@/domain/schedule/interest-only';

describe('Interest-Only Loan Schedule', () => {
  it('should generate correct schedule for a basic 12-month loan', () => {
    const schedule = generateInterestOnlySchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(12);
    expect(schedule[0].openingPrincipalCents).toBe(1200000);
    expect(schedule[11].closingPrincipalCents).toBe(0);
  });

  it('should have zero principal repayment except final installment', () => {
    const schedule = generateInterestOnlySchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    // All except last should have zero principal repayment
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i].principalRepaymentCents).toBe(0);
    }
    // Last should have full principal
    expect(schedule[schedule.length - 1].principalRepaymentCents).toBe(1200000);
  });

  it('should have constant interest payments', () => {
    const schedule = generateInterestOnlySchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    // All interest payments should be equal
    const interestPayments = schedule.map((s) => s.interestCents);
    const allEqual = interestPayments.every((p) => p === interestPayments[0]);
    expect(allEqual).toBe(true);
  });

  it('should handle zero-interest loan', () => {
    const schedule = generateInterestOnlySchedule({
      principalCents: 1200000,
      annualRate: 0,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    for (const inst of schedule) {
      expect(inst.interestCents).toBe(0);
    }
  });

  it('should have final installment with zero closing principal', () => {
    const schedule = generateInterestOnlySchedule({
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
    const schedule = generateInterestOnlySchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2024-01-01',
      maturityDate: '2024-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(12);
    expect(schedule[1].dueDate).toBe('2024-02-01');
  });
});
