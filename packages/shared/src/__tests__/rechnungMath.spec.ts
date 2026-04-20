import { describe, expect, it } from 'bun:test';
import { computeRechnungsLines, sumZeilenbetraege } from '../domain/rechnungMath';

describe('computeRechnungsLines (AC-RECH-02)', () => {
  it('multiplies be by stundensatzCents per line', () => {
    expect(computeRechnungsLines([{ be: 3 }], 4500)).toEqual([{ be: 3, zeilenbetragCents: 13500 }]);
  });

  it('handles multiple lines', () => {
    const lines = computeRechnungsLines([{ be: 2 }, { be: 1 }, { be: 3 }], 4500);
    expect(lines.map((l) => l.zeilenbetragCents)).toEqual([9000, 4500, 13500]);
  });

  it('rejects stundensatz <= 0', () => {
    expect(() => computeRechnungsLines([{ be: 1 }], 0)).toThrow(/> 0/);
    expect(() => computeRechnungsLines([{ be: 1 }], -45)).toThrow(/> 0/);
  });

  it('rejects be <= 0', () => {
    expect(() => computeRechnungsLines([{ be: 0 }], 4500)).toThrow(/≥ 1/);
  });

  it('rejects non-integer values', () => {
    expect(() => computeRechnungsLines([{ be: 1.5 }], 4500)).toThrow();
    expect(() => computeRechnungsLines([{ be: 1 }], 45.5)).toThrow();
  });
});

describe('sumZeilenbetraege', () => {
  it('sums cents exactly (no rounding)', () => {
    const lines = computeRechnungsLines([{ be: 2 }, { be: 2 }, { be: 2 }], 4500);
    expect(sumZeilenbetraege(lines)).toBe(27000);
  });

  it('returns 0 on empty input', () => {
    expect(sumZeilenbetraege([])).toBe(0);
  });
});
