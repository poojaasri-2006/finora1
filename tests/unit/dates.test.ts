/**
 * Unit tests for Date Utilities
 * 
 * Tests:
 * - Month-end handling
 * - Leap year handling
 * - Date arithmetic
 * - Period generation
 */

import { describe, it, expect } from 'vitest';
import {
  addMonths,
  addWeeks,
  addDays,
  daysBetween,
  isLeapYear,
  lastDayOfMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  isDateInRange,
  generatePeriodDates,
  periodsPerYear,
} from '@/domain/dates';

describe('Date Utilities', () => {
  describe('addMonths', () => {
    it('should add months correctly', () => {
      expect(addMonths('2025-01-15', 1)).toBe('2025-02-15');
      expect(addMonths('2025-01-15', 3)).toBe('2025-04-15');
      expect(addMonths('2025-01-15', 12)).toBe('2026-01-15');
    });

    it('should handle month-end correctly', () => {
      // Jan 31 + 1 month = Feb 28 (not Mar 3)
      expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
      // Jan 31 + 2 months = Mar 31
      expect(addMonths('2025-01-31', 2)).toBe('2025-03-31');
    });

    it('should handle leap year', () => {
      // Jan 31, 2024 + 1 month = Feb 29, 2024
      expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    });

    it('should handle year boundary', () => {
      expect(addMonths('2025-11-15', 3)).toBe('2026-02-15');
      expect(addMonths('2025-12-31', 1)).toBe('2026-01-31');
    });
  });

  describe('addWeeks', () => {
    it('should add weeks correctly', () => {
      expect(addWeeks('2025-01-01', 1)).toBe('2025-01-08');
      expect(addWeeks('2025-01-01', 4)).toBe('2025-01-29');
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      expect(addDays('2025-01-01', 7)).toBe('2025-01-08');
      expect(addDays('2025-01-01', 30)).toBe('2025-01-31');
    });

    it('should handle month boundary', () => {
      expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    });

    it('should handle year boundary', () => {
      expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      expect(daysBetween('2025-01-01', '2025-01-08')).toBe(7);
      expect(daysBetween('2025-01-01', '2025-02-01')).toBe(31);
    });

    it('should handle leap year', () => {
      expect(daysBetween('2024-02-01', '2024-03-01')).toBe(29);
      expect(daysBetween('2025-02-01', '2025-03-01')).toBe(28);
    });
  });

  describe('isLeapYear', () => {
    it('should identify leap years', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
    });
  });

  describe('lastDayOfMonth', () => {
    it('should return correct last day', () => {
      expect(lastDayOfMonth(2025, 0)).toBe(31); // January
      expect(lastDayOfMonth(2025, 1)).toBe(28); // February
      expect(lastDayOfMonth(2024, 1)).toBe(29); // February leap year
      expect(lastDayOfMonth(2025, 3)).toBe(30); // April
    });
  });

  describe('startOfMonth / endOfMonth', () => {
    it('should return correct boundaries', () => {
      expect(startOfMonth('2025-03-15')).toBe('2025-03-01');
      expect(endOfMonth('2025-03-15')).toBe('2025-03-31');
      expect(endOfMonth('2025-02-15')).toBe('2025-02-28');
      expect(endOfMonth('2024-02-15')).toBe('2024-02-29');
    });
  });

  describe('startOfWeek', () => {
    it('should return Monday of the week', () => {
      // 2025-01-01 is a Wednesday
      expect(startOfWeek('2025-01-01')).toBe('2024-12-30'); // Monday
      // 2025-01-06 is a Monday
      expect(startOfWeek('2025-01-06')).toBe('2025-01-06');
    });
  });

  describe('isDateInRange', () => {
    it('should check if date is in range', () => {
      expect(isDateInRange('2025-01-15', '2025-01-01', '2025-01-31')).toBe(true);
      expect(isDateInRange('2025-01-01', '2025-01-01', '2025-01-31')).toBe(true);
      expect(isDateInRange('2025-01-31', '2025-01-01', '2025-01-31')).toBe(true);
      expect(isDateInRange('2024-12-31', '2025-01-01', '2025-01-31')).toBe(false);
      expect(isDateInRange('2025-02-01', '2025-01-01', '2025-01-31')).toBe(false);
    });
  });

  describe('generatePeriodDates', () => {
    it('should generate monthly period dates', () => {
      const dates = generatePeriodDates('2025-01-01', '2025-03-31', 'MONTHLY');
      expect(dates).toEqual(['2025-01-01', '2025-02-01', '2025-03-01']);
    });

    it('should generate weekly period dates', () => {
      const dates = generatePeriodDates('2025-01-01', '2025-01-22', 'WEEKLY');
      expect(dates).toEqual(['2025-01-01', '2025-01-08', '2025-01-15', '2025-01-22']);
    });
  });

  describe('periodsPerYear', () => {
    it('should return correct periods per year', () => {
      expect(periodsPerYear('WEEKLY')).toBe(52);
      expect(periodsPerYear('BIWEEKLY')).toBe(26);
      expect(periodsPerYear('MONTHLY')).toBe(12);
      expect(periodsPerYear('QUARTERLY')).toBe(4);
      expect(periodsPerYear('ANNUAL')).toBe(1);
    });
  });
});
