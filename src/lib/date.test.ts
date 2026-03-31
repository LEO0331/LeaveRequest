import { describe, expect, it } from 'vitest';
import { calculateDurationDays, floorTwoDecimals } from './date';

describe('date helpers', () => {
  it('floors to two decimals', () => {
    expect(floorTwoDecimals(4.376)).toBe(4.37);
    expect(floorTwoDecimals(1.239)).toBe(1.23);
  });

  it('returns 0 for missing dates', () => {
    expect(calculateDurationDays('', '')).toBe(0);
  });

  it('calculates business-day duration with weekends and holidays excluded', () => {
    const start = '2026-03-01T08:00:00.000Z';
    const end = '2026-03-05T17:01:00.000Z';

    expect(calculateDurationDays(start, end)).toBe(4.04);
  });

  it('returns negative duration when end is before start', () => {
    const start = '2026-04-05T08:00:00.000Z';
    const end = '2026-04-04T08:00:00.000Z';

    expect(calculateDurationDays(start, end)).toBe(-1);
  });
});
