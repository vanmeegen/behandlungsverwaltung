import { describe, expect, it } from 'bun:test';
import { formatEuro } from '../format/euro';

// Intl can insert NBSP between amount and €; replace for readability in assertions.
function normalize(s: string): string {
  return s.replace(/\u00A0/g, ' ');
}

describe('formatEuro', () => {
  it('formats 0 as 0,00 €', () => {
    expect(normalize(formatEuro(0))).toBe('0,00 €');
  });

  it('formats 100 cents as 1,00 €', () => {
    expect(normalize(formatEuro(100))).toBe('1,00 €');
  });

  it('formats 27000 cents as 270,00 €', () => {
    expect(normalize(formatEuro(27000))).toBe('270,00 €');
  });

  it('formats 123456 cents as 1.234,56 €', () => {
    expect(normalize(formatEuro(123456))).toBe('1.234,56 €');
  });

  it('rejects non-integer input', () => {
    expect(() => formatEuro(1.5)).toThrow();
  });
});
