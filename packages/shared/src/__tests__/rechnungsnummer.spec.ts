import { describe, expect, it } from 'bun:test';
import {
  formatRechnungsnummer,
  generateRechnungsnummer,
  parseRechnungsnummer,
} from '../domain/rechnungsnummer';

describe('generateRechnungsnummer (PRD §4, AC-RECH-03, AC-RECH-04)', () => {
  it('returns 2026-04-0001 when no numbers exist yet in 2026 (AC-RECH-03)', () => {
    expect(generateRechnungsnummer([], 2026, 4)).toBe('2026-04-0001');
  });

  it('increments to 2026-05-0003 after two April invoices in 2026 (AC-RECH-04)', () => {
    expect(generateRechnungsnummer(['2026-04-0001', '2026-04-0002'], 2026, 5)).toBe('2026-05-0003');
  });

  it('resets to 0001 at the start of a new year', () => {
    expect(generateRechnungsnummer(['2025-12-0099'], 2026, 1)).toBe('2026-01-0001');
  });

  it('never fills gaps — max(NNNN)+1', () => {
    expect(generateRechnungsnummer(['2026-03-0005', '2026-03-0007'], 2026, 4)).toBe('2026-04-0008');
  });

  it('ignores entries from other years', () => {
    expect(generateRechnungsnummer(['2025-11-0050', '2026-02-0001'], 2026, 3)).toBe('2026-03-0002');
  });

  it('throws on malformed entries with a stable message', () => {
    expect(() => generateRechnungsnummer(['2026-04-ABCD'], 2026, 4)).toThrow(
      /Ungültige Rechnungsnummer/,
    );
  });

  it('pads months 1–9 with a leading zero', () => {
    expect(generateRechnungsnummer([], 2026, 1)).toBe('2026-01-0001');
    expect(generateRechnungsnummer([], 2026, 9)).toBe('2026-09-0001');
  });

  it('pads NNNN with leading zeros up to 4 digits', () => {
    expect(generateRechnungsnummer(['2026-04-0009'], 2026, 4)).toBe('2026-04-0010');
    expect(generateRechnungsnummer(['2026-04-0099'], 2026, 4)).toBe('2026-04-0100');
  });
});

describe('parseRechnungsnummer', () => {
  it('parses a valid number into year/month/lfd', () => {
    expect(parseRechnungsnummer('2026-04-0001')).toEqual({ year: 2026, month: 4, lfd: 1 });
  });

  it('throws on malformed input', () => {
    expect(() => parseRechnungsnummer('2026-4-1')).toThrow();
    expect(() => parseRechnungsnummer('invalid')).toThrow();
  });
});

describe('formatRechnungsnummer', () => {
  it('pads year/month/lfd correctly', () => {
    expect(formatRechnungsnummer(2026, 4, 1)).toBe('2026-04-0001');
    expect(formatRechnungsnummer(2026, 12, 9999)).toBe('2026-12-9999');
  });

  it('throws when month is out of range', () => {
    expect(() => formatRechnungsnummer(2026, 0, 1)).toThrow();
    expect(() => formatRechnungsnummer(2026, 13, 1)).toThrow();
  });

  it('throws when lfd is > 9999 (format can only hold 4 digits)', () => {
    expect(() => formatRechnungsnummer(2026, 4, 10000)).toThrow();
  });
});
