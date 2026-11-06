import { describe, expect, it } from 'vitest';
import { formatNaira, slugify, timeAgo, timeLeft } from './utils';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

describe('formatNaira', () => {
  it('formats integer kobo as naira', () => {
    expect(formatNaira(0)).toBe(naira.format(0));
    expect(formatNaira(100)).toBe(naira.format(1));
    expect(formatNaira(2_500_000)).toBe(naira.format(25_000));
  });
});

describe('slugify', () => {
  it('builds the drop URL slug the create form displays', () => {
    expect(slugify('ASH HOODIE VOL.1')).toBe('ash-hoodie-vol-1');
    expect(slugify('  Hello---World!! ')).toBe('hello-world');
    expect(slugify('')).toBe('');
    expect(slugify('ñand')).toBe('and');
    expect(slugify('a'.repeat(100))).toHaveLength(80);
  });
});

describe('timeLeft', () => {
  it('treats a past countdown as expired', () => {
    expect(timeLeft('2000-01-01T00:00:00.000Z')).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    });
  });

  it('returns a positive countdown for a future deadline', () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60_000).toISOString();
    const left = timeLeft(future);
    expect(left.expired).toBe(false);
    expect(left.days).toBeGreaterThanOrEqual(2);
    expect(left.days).toBeLessThanOrEqual(3);
  });
});

describe('timeAgo', () => {
  it('labels a timestamp from this moment as just now', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });
});
