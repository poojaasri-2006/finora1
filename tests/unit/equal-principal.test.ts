/**
 * Unit tests for Equal Principal Loan Schedule
 */

import { describe, it, expect } from 'vitest';
import { generateEqualPrincipalSchedule } from '@/domain/schedule/equal-principal';

describe('Equal Principal Loan Schedule', () => {
  it('should generate correct schedule for a basic 12-month loan', () => {
    const schedule = generateEqualPrincipalSchedule({
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

  it('should have equal principal repayments (except final)', () => {
    const schedule = generateEqualPrincipalSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    // All principal repayments should be equal (except possibly the last)
    const principalPayments = schedule.slice(0, -1).map((s) => s.principalRepaymentCents);
    const allEqual = principalPayments.every((p) => p === principalPayments[0]);
    expect(allEqual).toBe(true);
  });

  it('should have declining interest payments', () => {
    const schedule = generateEqualPrincipalSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    // Interest should decline over time
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].interestCents).toBeLessThanOrEqual(schedule[i - 1].interestCents);
    }
  });

  it('should handle zero-interest loan', () => {
    const schedule = generateEqualPrincipalSchedule({
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
    const schedule = generateEqualPrincipalSchedule({
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
    const schedule = generateEqualPrincipalSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2024-01-01',
      maturityDate: '2024-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(12);
    expect(schedule[1].dueDate).toBe('2024-02-01');
  });

  it('should maintain invariant: opening = previous closing', () => {
    const schedule = generateEqualPrincipalSchedule({
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
});
