/**
 * Date utilities — consistent date handling for financial calculations.
 * 
 * RULES:
 * - All dates are ISO 8601 strings (YYYY-MM-DD) in UTC.
 * - Month-end dates are preserved (e.g., Jan 31 + 1 month = Feb 28/29).
 * - Leap years are handled correctly.
 * - All date arithmetic uses UTC to avoid timezone issues.
 */

import type { ISODate } from './types';

/** Get today's date as an ISO string in UTC. */
export function todayISO(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

/** Get current date as a Date object (UTC midnight). */
export function todayDate(): Date {
  return new Date(todayISO() + 'T00:00:00Z');
}

/** Parse an ISO date string to a Date object (UTC midnight). */
export function parseISODate(dateStr: ISODate): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/** Format a Date object to an ISO date string. */
export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** Add months to a date, handling month-end correctly. 
 *  Jan 31 + 1 month = Feb 28 (or 29 in leap year)
 *  Jan 31 + 1 month + 1 month = Mar 31 (not Mar 28)
 */
export function addMonths(date: ISODate, months: number): ISODate {
  const d = parseISODate(date);
  const day = d.getUTCDate();
  const targetMonth = d.getUTCMonth() + months;
  const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  
  // Get the last day of the target month
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  
  // Use the minimum of original day and last day of target month
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  
  const result = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
  return toISODate(result);
}

/** Add weeks to a date. */
export function addWeeks(date: ISODate, weeks: number): ISODate {
  const d = parseISODate(date);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return toISODate(d);
}

/** Add days to a date. */
export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Get the number of days between two dates (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / msPerDay);
}

/** Check if a year is a leap year. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/** Get the last day of a month. */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Get the start of a month. */
export function startOfMonth(date: ISODate): ISODate {
  return date.slice(0, 7) + '-01';
}

/** Get the end of a month. */
export function endOfMonth(date: ISODate): ISODate {
  const d = parseISODate(date);
  const lastDay = lastDayOfMonth(d.getUTCFullYear(), d.getUTCMonth());
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), lastDay)));
}

/** Get the start of a week (Monday). */
export function startOfWeek(date: ISODate): ISODate {
  const d = parseISODate(date);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setUTCDate(d.getUTCDate() - daysToSubtract);
  return toISODate(d);
}

/** Get the end of a week (Sunday). */
export function endOfWeek(date: ISODate): ISODate {
  const d = parseISODate(date);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysToAdd = 6 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return toISODate(d);
}

/** Check if a date is within a range (inclusive). */
export function isDateInRange(date: ISODate, start: ISODate, end: ISODate): boolean {
  return date >= start && date <= end;
}

/** Check if a date is before another date. */
export function isBefore(a: ISODate, b: ISODate): boolean {
  return a < b;
}

/** Check if a date is after another date. */
export function isAfter(a: ISODate, b: ISODate): boolean {
  return a > b;
}

/** Get the number of periods between two dates for a given frequency. */
export function periodsBetween(start: ISODate, end: ISODate, frequency: string): number {
  switch (frequency) {
    case 'WEEKLY':
      return Math.ceil(daysBetween(start, end) / 7);
    case 'BIWEEKLY':
      return Math.ceil(daysBetween(start, end) / 14);
    case 'MONTHLY': {
      const startDate = parseISODate(start);
      const endDate = parseISODate(end);
      const months = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
        (endDate.getUTCMonth() - startDate.getUTCMonth());
      return Math.max(0, months);
    }
    case 'QUARTERLY':
      return Math.ceil(periodsBetween(start, end, 'MONTHLY') / 3);
    case 'ANNUAL': {
      const startDate = parseISODate(start);
      const endDate = parseISODate(end);
      return Math.max(0, endDate.getUTCFullYear() - startDate.getUTCFullYear());
    }
    default:
      return 0;
  }
}

/** Generate an array of period start dates between two dates. */
export function generatePeriodDates(start: ISODate, end: ISODate, frequency: string): ISODate[] {
  const dates: ISODate[] = [];
  let current = start;
  
  while (current <= end) {
    dates.push(current);
    switch (frequency) {
      case 'WEEKLY':
        current = addWeeks(current, 1);
        break;
      case 'BIWEEKLY':
        current = addWeeks(current, 2);
        break;
      case 'MONTHLY':
        current = addMonths(current, 1);
        break;
      case 'QUARTERLY':
        current = addMonths(current, 3);
        break;
      case 'ANNUAL':
        current = addMonths(current, 12);
        break;
      default:
        return dates;
    }
  }
  
  return dates;
}

/** Format a date for display. */
export function formatDate(date: ISODate, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parseISODate(date));
}

/** Format a date as "Mar 2025" for period labels. */
export function formatMonthYear(date: ISODate, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parseISODate(date));
}

/** Get the number of periods per year for a frequency. */
export function periodsPerYear(frequency: string): number {
  switch (frequency) {
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    case 'QUARTERLY': return 4;
    case 'ANNUAL': return 1;
    default: return 12;
  }
}
