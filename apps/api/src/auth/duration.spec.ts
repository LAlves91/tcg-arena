import { durationToMs, durationToSeconds } from './duration';

describe('duration parser', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['15m', 15 * 60_000],
    ['2h', 2 * 3_600_000],
    ['30d', 30 * 86_400_000],
  ])('parses %s to %d ms', (input, expected) => {
    expect(durationToMs(input)).toBe(expected);
  });

  it('converts to whole seconds (floor)', () => {
    expect(durationToSeconds('1500ms')).toBe(1);
    expect(durationToSeconds('30s')).toBe(30);
  });

  it('rejects invalid inputs', () => {
    expect(() => durationToMs('abc')).toThrow();
    expect(() => durationToMs('15')).toThrow();
    expect(() => durationToMs('15y')).toThrow();
  });
});
