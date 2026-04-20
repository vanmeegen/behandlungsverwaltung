import { describe, expect, it } from 'bun:test';
import { auftraggeberSchema } from '../validation';

const validFirma = {
  typ: 'firma' as const,
  firmenname: 'Jugendamt Köln',
  vorname: null,
  nachname: null,
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
};

const validPerson = {
  typ: 'person' as const,
  firmenname: null,
  vorname: 'Petra',
  nachname: 'Privatzahlerin',
  strasse: 'Lindenallee',
  hausnummer: '7',
  plz: '50667',
  stadt: 'Köln',
  stundensatzCents: 6000,
};

describe('auftraggeberSchema (PRD §2.2, AC-AG-02, AC-AG-03)', () => {
  it('accepts a fully populated Firma', () => {
    const result = auftraggeberSchema.safeParse(validFirma);
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated Person', () => {
    const result = auftraggeberSchema.safeParse(validPerson);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown typ', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, typ: 'behoerde' });
    expect(result.success).toBe(false);
  });

  it('rejects Firma without firmenname', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, firmenname: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Firmenname Pflicht');
    }
  });

  it('rejects Person without vorname with "Vor- und Nachname Pflicht"', () => {
    const result = auftraggeberSchema.safeParse({ ...validPerson, vorname: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Vor- und Nachname Pflicht');
    }
  });

  it('rejects Person without nachname with "Vor- und Nachname Pflicht"', () => {
    const result = auftraggeberSchema.safeParse({ ...validPerson, nachname: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Vor- und Nachname Pflicht');
    }
  });

  it('rejects any input without plz with "PLZ ist Pflicht" (AC-AG-03)', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, plz: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const plzIssue = result.error.issues.find((i) => i.path.includes('plz'));
      expect(plzIssue?.message).toBe('PLZ ist Pflicht');
    }
  });

  it('rejects a missing strasse', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, strasse: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing hausnummer', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, hausnummer: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing stadt', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, stadt: '' });
    expect(result.success).toBe(false);
  });

  it('rejects stundensatzCents = 0 with "Stundensatz muss > 0 sein"', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, stundensatzCents: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Stundensatz muss > 0 sein');
    }
  });

  it('rejects negative stundensatzCents', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, stundensatzCents: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer stundensatzCents', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, stundensatzCents: 45.5 });
    expect(result.success).toBe(false);
  });
});
