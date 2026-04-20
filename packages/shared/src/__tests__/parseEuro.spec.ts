import { describe, expect, it } from 'bun:test';
import { parseEuroToCents } from '../format/parseEuro';

describe('parseEuroToCents', () => {
  it('parses "45,00" as 4500', () => {
    expect(parseEuroToCents('45,00')).toBe(4500);
  });

  it('parses "45" as 4500', () => {
    expect(parseEuroToCents('45')).toBe(4500);
  });

  it('parses "45.50" (dot) as 4550', () => {
    expect(parseEuroToCents('45.50')).toBe(4550);
  });

  it('rejects "45,5" (one decimal) with null', () => {
    expect(parseEuroToCents('45,5')).toBeNull();
  });

  it('rejects negative values with null', () => {
    expect(parseEuroToCents('-45,00')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(parseEuroToCents('')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(parseEuroToCents('abc')).toBeNull();
  });

  it('ignores leading/trailing whitespace', () => {
    expect(parseEuroToCents('  45,00  ')).toBe(4500);
  });
});
