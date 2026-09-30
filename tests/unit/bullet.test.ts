/**
 * Unit tests for Bullet Loan Schedule
 */

import { describe, it, expect } from 'vitest';
import { generateBulletSchedule } from '@/domain/schedule/bullet';

describe('Bullet Loan Schedule', () => {
  it('should generate a single installment at maturity', () => {
    const schedule = generateBulletSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule).toHaveLength(1);
    expect(schedule[0].dueDate).toBe('2025-12-31');
    expect(schedule[0].principalRepaymentCents).toBe(1200000);
    expect(schedule[0].closingPrincipalCents).toBe(0);
  });

  it('should calculate correct interest for one year', () => {
    const schedule = generateBulletSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    // Interest = 1200000 * 0.12 * (364/365) = 143605 (rounded)
    // 2025-01-01 to 2025-12-31 is 364 days
    expect(schedule[0].interestCents).toBe(143605);
  });

  it('should handle zero-interest loan', () => {
    const schedule = generateBulletSchedule({
      principalCents: 1200000,
      annualRate: 0,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
    });

    expect(schedule[0].interestCents).toBe(0);
    expect(schedule[0].totalPaymentCents).toBe(1200000);
  });

  it('should include fees in total payment', () => {
    const schedule = generateBulletSchedule({
      principalCents: 1200000,
      annualRate: 0.12,
      startDate: '2025-01-01',
      maturityDate: '2025-12-31',
      frequency: 'MONTHLY',
      feesCents: 50000,
    });

    expect(schedule[0].feesCents).toBe(50000);
    // Interest = 1200000 * 0.12 * 364/365 = 143605
    expect(schedule[0].totalPaymentCents).toBe(1200000 + 143605 + 50000);
  });

  it('should handle multi-year bullet loan', () => {
    const schedule = generateBulletSchedule({
      principalCents: 5000000,
      annualRate: 0.08,
      startDate: '2025-01-01',
      maturityDate: '2028-01-01',
      frequency: 'ANNUAL',
    });

    expect(schedule).toHaveLength(1);
    // Interest = 50000 * 0.08 * 3 = 12000 (1200000 cents)
    expect(schedule[0].interestCents).toBe(1200000);
  });
});
