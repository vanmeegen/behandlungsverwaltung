import { describe, expect, it } from 'bun:test';
import { erziehungsberechtigterSchema } from '../validation/erziehungsberechtigte';

const baseValid = {
  slot: 1 as const,
  vorname: 'Maria',
  nachname: 'Musterfrau',
};

describe('erziehungsberechtigterSchema (AC-EZB-01)', () => {
  it('accepts minimal valid input (vorname + nachname + slot)', () => {
    const result = erziehungsberechtigterSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('rejects missing vorname with "Vorname ist Pflicht"', () => {
    const result = erziehungsberechtigterSchema.safeParse({ ...baseValid, vorname: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('vorname'));
      expect(issue?.message).toBe('Vorname ist Pflicht');
    }
  });

  it('rejects missing nachname with "Nachname ist Pflicht"', () => {
    const result = erziehungsberechtigterSchema.safeParse({ ...baseValid, nachname: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('nachname'));
      expect(issue?.message).toBe('Nachname ist Pflicht');
    }
  });

  it('accepts all address fields empty (address optional)', () => {
    const result = erziehungsberechtigterSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('requires all four address fields when one is set (PLZ is Pflicht)', () => {
    const result = erziehungsberechtigterSchema.safeParse({
      ...baseValid,
      strasse: 'Hauptstr.',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('plz'));
      expect(issue?.message).toBe('PLZ ist Pflicht');
    }
  });

  it('accepts valid address when all four fields are set', () => {
    const result = erziehungsberechtigterSchema.safeParse({
      ...baseValid,
      strasse: 'Hauptstr.',
      hausnummer: '12',
      plz: '50667',
      stadt: 'Köln',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid email1', () => {
    const result = erziehungsberechtigterSchema.safeParse({
      ...baseValid,
      email1: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email1 format', () => {
    const result = erziehungsberechtigterSchema.safeParse({
      ...baseValid,
      email1: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts telefon1 as arbitrary string', () => {
    const result = erziehungsberechtigterSchema.safeParse({
      ...baseValid,
      telefon1: '0221/12345-67',
    });
    expect(result.success).toBe(true);
  });

  it('accepts slot=2', () => {
    const result = erziehungsberechtigterSchema.safeParse({ ...baseValid, slot: 2 });
    expect(result.success).toBe(true);
  });

  it('rejects slot=3', () => {
    const result = erziehungsberechtigterSchema.safeParse({ ...baseValid, slot: 3 as unknown });
    expect(result.success).toBe(false);
  });
});
