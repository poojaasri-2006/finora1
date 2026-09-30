/**
 * Money utilities — exact decimal arithmetic using integer cents.
 * 
 * RULES:
 * - All money values are stored and computed as integer cents.
 * - Never use floating-point numbers for money.
 * - Rounding: Math.round() for standard rounding to nearest cent.
 * - The final installment in any schedule absorbs residual rounding differences.
 */

import type { Cents, Money } from './types';

/** Create a Money object from dollar/euro/etc. amount (will be rounded to cents). */
export function moneyFromAmount(amount: number, currency = 'USD'): Money {
  return { cents: Math.round(amount * 100), currency };
}

/** Create a Money object from cents. */
export function moneyFromCents(cents: Cents, currency = 'USD'): Money {
  return { cents, currency };
}

/** Convert Money to a display amount (dollars). */
export function moneyToAmount(m: Money): number {
  return m.cents / 100;
}

/** Add two money amounts. */
export function addMoney(a: Cents, b: Cents): Cents {
  return a + b;
}

/** Subtract money: a - b. */
export function subtractMoney(a: Cents, b: Cents): Cents {
  return a - b;
}

/** Multiply money by a scalar (e.g., for percentage adjustments). Result is rounded to nearest cent. */
export function multiplyMoney(cents: Cents, factor: number): Cents {
  return Math.round(cents * factor);
}

/** Round a cents value to the nearest cent (no-op for integers, but useful for computed values). */
export function roundCents(value: number): Cents {
  return Math.round(value);
}

/** Check if a money amount is negative. */
export function isNegative(cents: Cents): boolean {
  return cents < 0;
}

/** Check if a money amount is zero. */
export function isZero(cents: Cents): boolean {
  return cents === 0;
}

/** Get absolute value of cents. */
export function absCents(cents: Cents): Cents {
  return Math.abs(cents);
}

/** Format cents as a currency string for display. */
export function formatMoney(cents: Cents, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Format cents as a compact currency string (e.g., $1.2K). */
export function formatMoneyCompact(cents: Cents, currency = 'USD', locale = 'en-US'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Parse a money string (e.g., "1234.56") to cents. Returns null if invalid. */
export function parseMoneyToCents(value: string): Cents | null {
  const trimmed = value.trim().replace(/[$€£,\s]/g, '');
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.round(num * 100);
}

/** Sum an array of cents values. */
export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Validate that a cents value is a safe integer. */
export function isValidCents(cents: Cents): boolean {
  return Number.isSafeInteger(cents);
}
