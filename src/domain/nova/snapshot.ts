import { addDays, daysBetween } from '../dates';

// Nova's sample books compute overdue status against this fixed date.
export const NOVA_AS_OF_DATE = '2026-09-29';
const WEEKS = 13;

type MoneyRow = { id: string; status?: string; due_date?: string; balance_due?: number; total_amount?: number; paid_amount?: number };
type LoanSchedule = { id: string; status: string; due_date: string; total_due: number };
type PayrollRun = { id: string; pay_date: string; net: number };
type StatutoryDue = { id: string; status: string; due_date: string; amount: number };

export type NovaSnapshotInput = {
  invoices: MoneyRow[];
  purchaseBills: MoneyRow[];
  loanSchedules: LoanSchedule[];
  payrollRuns: PayrollRun[];
  statutoryDues: StatutoryDue[];
};

export type NovaWeek = {
  startDate: string;
  endDate: string;
  receivablesPaise: number;
  billsPaise: number;
  loansPaise: number;
  payrollPaise: number;
  taxesPaise: number;
  netPaise: number;
  cumulativeNetPaise: number;
};

export type NovaSnapshot = {
  asOfDate: string;
  throughDate: string;
  currency: 'INR';
  weeks: NovaWeek[];
  totals: { receivablesPaise: number; billsPaise: number; loansPaise: number; payrollPaise: number; taxesPaise: number; netPaise: number; peakGapPaise: number };
};

function paise(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Nova returned an invalid monetary amount');
  }
  return Math.round(value * 100);
}

function balanceDue(row: MoneyRow): number {
  if (typeof row.balance_due === 'number') return paise(row.balance_due);
  if (typeof row.total_amount === 'number' && typeof row.paid_amount === 'number') {
    return Math.max(0, paise(row.total_amount) - paise(row.paid_amount));
  }
  throw new Error('Nova returned a document without a balance due');
}

function weekIndex(date: unknown): number | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Nova returned a record without a valid date');
  }
  const day = daysBetween(NOVA_AS_OF_DATE, date);
  if (!Number.isFinite(day)) throw new Error('Nova returned a record without a valid date');
  if (day >= WEEKS * 7) return null;
  // Outstanding past-due items belong in the first week as backlog.
  return Math.max(0, Math.floor(day / 7));
}

export function buildNovaSnapshot(input: NovaSnapshotInput): NovaSnapshot {
  const weeks: NovaWeek[] = Array.from({ length: WEEKS }, (_, index) => ({
    startDate: addDays(NOVA_AS_OF_DATE, index * 7),
    endDate: addDays(NOVA_AS_OF_DATE, index * 7 + 6),
    receivablesPaise: 0,
    billsPaise: 0,
    loansPaise: 0,
    payrollPaise: 0,
    taxesPaise: 0,
    netPaise: 0,
    cumulativeNetPaise: 0,
  }));

  for (const row of input.invoices) {
    if (row.status === 'paid') continue;
    const index = weekIndex(row.due_date);
    if (index !== null) weeks[index].receivablesPaise += balanceDue(row);
  }
  for (const row of input.purchaseBills) {
    if (row.status === 'paid') continue;
    const index = weekIndex(row.due_date);
    if (index !== null) weeks[index].billsPaise += balanceDue(row);
  }
  for (const row of input.loanSchedules) {
    if (row.status === 'paid') continue;
    const index = weekIndex(row.due_date);
    if (index !== null) weeks[index].loansPaise += paise(row.total_due);
  }
  for (const row of input.payrollRuns) {
    const index = weekIndex(row.pay_date);
    // Past payroll may already be reflected in the opening balance.
    if (index !== null && row.pay_date >= NOVA_AS_OF_DATE) weeks[index].payrollPaise += paise(row.net);
  }
  for (const row of input.statutoryDues) {
    if (row.status === 'paid') continue;
    const index = weekIndex(row.due_date);
    if (index !== null) weeks[index].taxesPaise += paise(row.amount);
  }

  let cumulative = 0;
  let peakGapPaise = 0;
  for (const week of weeks) {
    week.netPaise = week.receivablesPaise - week.billsPaise - week.loansPaise - week.payrollPaise - week.taxesPaise;
    cumulative += week.netPaise;
    week.cumulativeNetPaise = cumulative;
    peakGapPaise = Math.max(peakGapPaise, -cumulative);
  }

  const sum = (field: 'receivablesPaise' | 'billsPaise' | 'loansPaise' | 'payrollPaise' | 'taxesPaise') =>
    weeks.reduce((total, week) => total + week[field], 0);

  return {
    asOfDate: NOVA_AS_OF_DATE,
    throughDate: weeks[WEEKS - 1].endDate,
    currency: 'INR',
    weeks,
    totals: {
      receivablesPaise: sum('receivablesPaise'),
      billsPaise: sum('billsPaise'),
      loansPaise: sum('loansPaise'),
      payrollPaise: sum('payrollPaise'),
      taxesPaise: sum('taxesPaise'),
      netPaise: cumulative,
      peakGapPaise,
    },
  };
}
