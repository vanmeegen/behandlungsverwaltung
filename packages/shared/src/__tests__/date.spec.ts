import { describe, expect, it } from 'bun:test';
import { formatDateDe, formatLeistungszeitraum, monatName } from '../format/date';

describe('formatDateDe', () => {
  it('formats a date as DD.MM.YYYY', () => {
    expect(formatDateDe(new Date(2026, 0, 19))).toBe('19.01.2026');
    expect(formatDateDe(new Date(2026, 11, 31))).toBe('31.12.2026');
  });

  it('pads single-digit day and month', () => {
    expect(formatDateDe(new Date(2026, 2, 5))).toBe('05.03.2026');
  });
});

describe('monatName', () => {
  it('returns the German month name', () => {
    expect(monatName(1)).toBe('Januar');
    expect(monatName(3)).toBe('März');
    expect(monatName(12)).toBe('Dezember');
  });

  it('rejects out-of-range month numbers', () => {
    expect(() => monatName(0)).toThrow();
    expect(() => monatName(13)).toThrow();
    expect(() => monatName(1.5)).toThrow();
  });
});

describe('formatLeistungszeitraum', () => {
  it('returns first..last day of month in DE format', () => {
    expect(formatLeistungszeitraum(2026, 1)).toBe('01.01.2026 – 31.01.2026');
    expect(formatLeistungszeitraum(2026, 4)).toBe('01.04.2026 – 30.04.2026');
  });

  it('handles non-leap February', () => {
    expect(formatLeistungszeitraum(2026, 2)).toBe('01.02.2026 – 28.02.2026');
  });

  it('handles leap-year February', () => {
    expect(formatLeistungszeitraum(2028, 2)).toBe('01.02.2028 – 29.02.2028');
  });

  it('rejects invalid year or month', () => {
    expect(() => formatLeistungszeitraum(999, 1)).toThrow();
    expect(() => formatLeistungszeitraum(2026, 0)).toThrow();
    expect(() => formatLeistungszeitraum(2026, 13)).toThrow();
  });
});
