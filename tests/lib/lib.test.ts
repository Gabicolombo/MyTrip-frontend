import { describe, expect, it } from 'vitest';
import { getCurrentUserId } from '@/lib/auth';
import { formatBudgetAmount, readBudgetSummary, summarizeDestination } from '@/lib/budget';
import { itineraryCost } from '@/lib/itinerary-cost';
import { formatDate } from '@/lib/utils';
import { signIn } from '../helpers';

describe('getCurrentUserId', () => {
  it('reads the id from the stored token', () => {
    signIn(42);
    expect(getCurrentUserId()).toBe(42);
  });

  it('returns null without a token or with a malformed one', () => {
    expect(getCurrentUserId()).toBeNull();
    localStorage.setItem('token', 'not-a-jwt');
    expect(getCurrentUserId()).toBeNull();
    localStorage.setItem('token', `a.${btoa(JSON.stringify({ id: '7' }))}.c`);
    expect(getCurrentUserId()).toBeNull();
  });
});

describe('itineraryCost', () => {
  it('returns no expense when both fields are empty', () => {
    expect(itineraryCost('  ', '')).toEqual({ amount: null, currency: null });
  });

  it('normalizes a comma decimal', () => {
    expect(itineraryCost(' 12,50 ', 'EUR')).toEqual({ amount: '12.50', currency: 'EUR' });
  });

  it('requires amount and currency together', () => {
    expect(() => itineraryCost('', 'EUR')).toThrow('Enter an amount or clear the expense.');
    expect(() => itineraryCost('10', '')).toThrow('Select a currency for the amount.');
  });

  it.each(['-1', '1,000.00', 'abc', '1e3'])('rejects the invalid amount %s', amount => {
    expect(() => itineraryCost(amount, 'USD')).toThrow('Enter a valid amount');
  });
});

describe('budget', () => {
  it('sums expenses per currency and per category without float errors', () => {
    const summary = summarizeDestination([
      { activity: 'Museum', amount: '0.10', currency: 'EUR' },
      { activity: 'Museum', amount: '0.20', currency: 'EUR' },
      { activity: 'Bar', amount: '5', currency: 'EUR' },
      { activity: 'Bar', amount: '7.5', currency: 'USD' },
      { activity: 'Park', amount: null, currency: null },
    ]);
    expect(summary.totals).toEqual([
      { currency: 'EUR', amount: '5.30' },
      { currency: 'USD', amount: '7.5' },
    ]);
    expect(summary.byCategory).toEqual([
      { activity: 'Bar', currency: 'EUR', amount: '5' },
      { activity: 'Bar', currency: 'USD', amount: '7.5' },
      { activity: 'Museum', currency: 'EUR', amount: '0.30' },
    ]);
  });

  it('formats amounts with thousands separators and two decimals', () => {
    expect(formatBudgetAmount('1234567.5')).toBe('1,234,567.50');
    expect(formatBudgetAmount('007')).toBe('7.00');
    expect(formatBudgetAmount('0')).toBe('0.00');
  });

  it('validates a budget summary from the API', () => {
    const valid = { totals: [{ currency: 'EUR', amount: '10.5' }], byCategory: [{ activity: 'Bar', currency: 'EUR', amount: '10.5' }] };
    expect(readBudgetSummary(valid)).toEqual(valid);
    expect(() => readBudgetSummary({ ...valid, totals: [{ currency: 'eur', amount: '10' }] })).toThrow('Invalid expense amount or currency.');
    expect(() => readBudgetSummary({ ...valid, byCategory: [{ activity: ' ', currency: 'EUR', amount: '1' }] })).toThrow('Invalid expense category.');
    expect(() => readBudgetSummary({ totals: [] } as never)).toThrow('Invalid budget summary.');
  });
});

describe('formatDate', () => {
  it('formats the calendar date regardless of timezone', () => {
    expect(formatDate('2026-03-05T23:30:00.000Z')).toBe('05 Mar 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
    expect(formatDate('')).toBe('');
  });
});
