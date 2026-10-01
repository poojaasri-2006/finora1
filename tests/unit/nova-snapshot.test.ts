import { describe, expect, it } from 'vitest';
import { buildNovaSnapshot } from '../../src/domain/nova/snapshot';

describe('Nova planning snapshot', () => {
  it('groups live obligations and receivables by due week in integer paise', () => {
    const result = buildNovaSnapshot({
      invoices: [
        { id: 'i1', status: 'overdue', due_date: '2026-09-25', balance_due: 100.25 },
        { id: 'i2', status: 'paid', due_date: '2026-10-01', balance_due: 200 },
      ],
      purchaseBills: [{ id: 'b1', status: 'partial', due_date: '2026-10-08', total_amount: 80, paid_amount: 20 }],
      loanSchedules: [
        { id: 'l1', status: 'due', due_date: '2026-10-02', total_due: 30.1 },
        { id: 'l2', status: 'paid', due_date: '2026-10-02', total_due: 99 },
      ],
      payrollRuns: [
        { id: 'p1', pay_date: '2026-10-03', net: 20.05 },
        { id: 'p2', pay_date: '2026-09-01', net: 50 },
      ],
      statutoryDues: [{ id: 's1', status: 'upcoming', due_date: '2026-10-08', amount: 10 }],
    });

    expect(result.weeks[0].receivablesPaise).toBe(10025);
    expect(result.weeks[0].loansPaise).toBe(3010);
    expect(result.weeks[0].payrollPaise).toBe(2005);
    expect(result.weeks[1].billsPaise).toBe(6000);
    expect(result.weeks[1].taxesPaise).toBe(1000);
    expect(result.totals.netPaise).toBe(-1990);
    expect(result.totals.peakGapPaise).toBe(1990);
    expect(result.weeks).toHaveLength(13);
  });

  it('rejects missing balances instead of silently understating commitments', () => {
    expect(() => buildNovaSnapshot({
      invoices: [],
      purchaseBills: [{ id: 'b1', status: 'pending', due_date: '2026-10-01' }],
      loanSchedules: [], payrollRuns: [], statutoryDues: [],
    })).toThrow('balance due');
  });
});
