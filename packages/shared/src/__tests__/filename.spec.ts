import { describe, expect, it } from 'bun:test';
import { sanitizeKindesname } from '../format/filename';

describe('sanitizeKindesname', () => {
  it('joins simple vorname and nachname with underscore', () => {
    expect(sanitizeKindesname('Anna', 'Musterfrau')).toBe('Anna_Musterfrau');
  });

  it('folds German umlauts', () => {
    expect(sanitizeKindesname('Björn', 'Über-Meier')).toBe('Bjoern_Ueber_Meier');
    expect(sanitizeKindesname('Käthe', 'Groß')).toBe('Kaethe_Gross');
  });

  it('strips punctuation and other special chars', () => {
    expect(sanitizeKindesname("O'Brien", 'Smith, Jr.')).toBe('O_Brien_Smith_Jr');
  });

  it('returns just one segment when the other is empty', () => {
    expect(sanitizeKindesname('', 'Musterfrau')).toBe('Musterfrau');
    expect(sanitizeKindesname('Anna', '')).toBe('Anna');
  });

  it('returns "Unbekannt" when both are empty after sanitization', () => {
    expect(sanitizeKindesname('', '')).toBe('Unbekannt');
    expect(sanitizeKindesname('!!!', '???')).toBe('Unbekannt');
  });

  it('output matches /^[A-Za-z0-9_]+$/', () => {
    const samples: Array<[string, string]> = [
      ['Jürgen-Peter', "d'Artagnan"],
      ['Çağlar', 'Özil'],
      ['Mary-Ann', 'Smith-Jones'],
    ];
    for (const [v, n] of samples) {
      expect(sanitizeKindesname(v, n)).toMatch(/^[A-Za-z0-9_]+$/);
    }
  });
});
