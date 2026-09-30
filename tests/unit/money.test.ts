/**
 * Unit tests for Money Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  moneyFromAmount,
  moneyFromCents,
  moneyToAmount,
  addMoney,
  subtractMoney,
  multiplyMoney,
  roundCents,
  isNegative,
  isZero,
  absCents,
  formatMoney,
  parseMoneyToCents,
  sumCents,
  isValidCents,
} from '@/domain/money';

describe('Money Utilities', () => {
  describe('moneyFromAmount', () => {
    it('should convert amount to cents', () => {
      expect(moneyFromAmount(100).cents).toBe(10000);
      expect(moneyFromAmount(100.5).cents).toBe(10050);
      expect(moneyFromAmount(0.01).cents).toBe(1);
    });

    it('should round to nearest cent', () => {
      expect(moneyFromAmount(100.005).cents).toBe(10001);
      expect(moneyFromAmount(100.004).cents).toBe(10000);
    });
  });

  describe('moneyFromCents', () => {
    it('should create money from cents', () => {
      expect(moneyFromCents(10000).cents).toBe(10000);
      expect(moneyFromCents(10000).currency).toBe('USD');
    });
  });

  describe('moneyToAmount', () => {
    it('should convert cents to amount', () => {
      expect(moneyToAmount({ cents: 10000, currency: 'USD' })).toBe(100);
      expect(moneyToAmount({ cents: 1, currency: 'USD' })).toBe(0.01);
    });
  });

  describe('addMoney / subtractMoney', () => {
    it('should add and subtract correctly', () => {
      expect(addMoney(10000, 5000)).toBe(15000);
      expect(subtractMoney(10000, 5000)).toBe(5000);
      expect(subtractMoney(5000, 10000)).toBe(-5000);
    });
  });

  describe('multiplyMoney', () => {
    it('should multiply and round', () => {
      expect(multiplyMoney(10000, 1.5)).toBe(15000);
      expect(multiplyMoney(10000, 0.1)).toBe(1000);
    });
  });

  describe('roundCents', () => {
    it('should round to nearest cent', () => {
      expect(roundCents(100.4)).toBe(100);
      expect(roundCents(100.5)).toBe(101);
      expect(roundCents(100.6)).toBe(101);
    });
  });

  describe('isNegative / isZero / absCents', () => {
    it('should check sign', () => {
      expect(isNegative(-100)).toBe(true);
      expect(isNegative(100)).toBe(false);
      expect(isZero(0)).toBe(true);
      expect(isZero(100)).toBe(false);
      expect(absCents(-100)).toBe(100);
      expect(absCents(100)).toBe(100);
    });
  });

  describe('formatMoney', () => {
    it('should format as currency', () => {
      expect(formatMoney(10000, 'USD')).toBe('$100.00');
      expect(formatMoney(1000000, 'USD')).toBe('$10,000.00');
    });
  });

  describe('parseMoneyToCents', () => {
    it('should parse money strings', () => {
      expect(parseMoneyToCents('100')).toBe(10000);
      expect(parseMoneyToCents('100.50')).toBe(10050);
      expect(parseMoneyToCents('$1,000.00')).toBe(100000);
    });

    it('should return null for invalid input', () => {
      expect(parseMoneyToCents('abc')).toBeNull();
      expect(parseMoneyToCents('')).toBeNull();
    });
  });

  describe('sumCents', () => {
    it('should sum array of cents', () => {
      expect(sumCents([100, 200, 300])).toBe(600);
      expect(sumCents([])).toBe(0);
    });
  });

  describe('isValidCents', () => {
    it('should validate safe integers', () => {
      expect(isValidCents(100)).toBe(true);
      expect(isValidCents(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(isValidCents(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    });
  });
});
