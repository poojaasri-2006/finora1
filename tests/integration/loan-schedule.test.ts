/**
 * Integration tests for Loan Schedule Generation
 * 
 * Tests the full flow from loan parameters to schedule generation
 * and persistence.
 */

import { describe, it, expect } from 'vitest';
import { generateSchedule } from '@/domain/schedule';
import { prisma } from '@/lib/db';

describe('Loan Schedule Integration', () => {
  it('should create a loan and generate a schedule', async () => {
    // Create a financing account
    const account = await prisma.financingAccount.create({
      data: {
        organizationId: 'demo-org',
        name: 'Test Integration Loan',
        lender: 'Test Bank',
        type: 'TERM_LOAN',
        originalPrincipalCents: 10000000,
        outstandingPrincipalCents: 10000000,
        annualInterestRate: 0.06,
        interestType: 'FIXED',
        startDate: '2025-01-01',
        maturityDate: '2026-01-01',
        paymentFrequency: 'MONTHLY',
        repaymentMethod: 'AMORTIZING',
        status: 'ACTIVE',
      },
    });

    expect(account.id).toBeDefined();
    expect(account.outstandingPrincipalCents).toBe(10000000);

    // Generate schedule
    const schedule = generateSchedule({
      principalCents: account.outstandingPrincipalCents,
      annualRate: account.annualInterestRate,
      startDate: account.startDate,
      maturityDate: account.maturityDate,
      frequency: account.paymentFrequency as any,
      repaymentMethod: account.repaymentMethod as any,
      feesCents: account.feesCents,
      gracePeriodMonths: account.gracePeriodMonths,
    });

    expect(schedule.length).toBe(12);
    expect(schedule[0].openingPrincipalCents).toBe(10000000);
    expect(schedule[11].closingPrincipalCents).toBe(0);

    // Clean up
    await prisma.financingAccount.delete({ where: { id: account.id } });
  });

  it('should handle multiple loan types', async () => {
    const loanTypes = [
      { method: 'AMORTIZING' as const, name: 'Amortizing Loan' },
      { method: 'EQUAL_PRINCIPAL' as const, name: 'Equal Principal Loan' },
      { method: 'INTEREST_ONLY' as const, name: 'Interest Only Loan' },
      { method: 'BULLET' as const, name: 'Bullet Loan' },
    ];

    for (const loanType of loanTypes) {
      const account = await prisma.financingAccount.create({
        data: {
          organizationId: 'demo-org',
          name: loanType.name,
          lender: 'Test Bank',
          type: 'TERM_LOAN',
          originalPrincipalCents: 5000000,
          outstandingPrincipalCents: 5000000,
          annualInterestRate: 0.08,
          interestType: 'FIXED',
          startDate: '2025-01-01',
          maturityDate: '2026-01-01',
          paymentFrequency: 'MONTHLY',
          repaymentMethod: loanType.method,
          status: 'ACTIVE',
        },
      });

      const schedule = generateSchedule({
        principalCents: account.outstandingPrincipalCents,
        annualRate: account.annualInterestRate,
        startDate: account.startDate,
        maturityDate: account.maturityDate,
        frequency: account.paymentFrequency as any,
        repaymentMethod: account.repaymentMethod as any,
      });

      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[schedule.length - 1].closingPrincipalCents).toBe(0);

      // Clean up
      await prisma.financingAccount.delete({ where: { id: account.id } });
    }
  });
});
