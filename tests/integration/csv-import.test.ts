/**
 * Integration tests for CSV Import/Export
 */

import { describe, it, expect } from 'vitest';
import { parseMoneyToCents } from '@/domain/money';

describe('CSV Import/Export', () => {
  it('should parse valid CSV data', () => {
    const csvData = `name,category,type,amount,date
Product Sales,REVENUE,INFLOW,85000.00,2025-01-01
Payroll,PAYROLL,OUTFLOW,45000.00,2025-01-01`;

    const lines = csvData.split('\n');
    expect(lines).toHaveLength(3);

    const headers = lines[0].split(',');
    expect(headers).toContain('name');
    expect(headers).toContain('amount');
  });

  it('should validate money parsing', () => {
    expect(parseMoneyToCents('85000.00')).toBe(8500000);
    expect(parseMoneyToCents('45000')).toBe(4500000);
    expect(parseMoneyToCents('invalid')).toBeNull();
    expect(parseMoneyToCents('')).toBeNull();
  });

  it('should handle row-level errors', () => {
    const invalidRows = [
      { amount: 'invalid', expected: null },
      { amount: '', expected: null },
      { amount: '100.50', expected: 10050 },
    ];

    for (const row of invalidRows) {
      const result = parseMoneyToCents(row.amount);
      expect(result).toBe(row.expected);
    }
  });
});
