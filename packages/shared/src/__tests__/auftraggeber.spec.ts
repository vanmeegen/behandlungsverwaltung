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
  abteilung: null,
  rechnungskopfText: 'Mein Honorar für …:',
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
  abteilung: null,
  rechnungskopfText: 'Mein Honorar für …:',
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

describe('auftraggeberSchema — abteilung (PRD §2.2, AC-AG-04)', () => {
  it('accepts a Firma with abteilung set', () => {
    const result = auftraggeberSchema.safeParse({
      ...validFirma,
      abteilung: 'Wirtschaftliche Jugendhilfe',
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'firma') {
      expect(result.data.abteilung).toBe('Wirtschaftliche Jugendhilfe');
    }
  });

  it('accepts a Firma without abteilung (null)', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, abteilung: null });
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'firma') {
      expect(result.data.abteilung).toBeNull();
    }
  });

  it('accepts a Firma with abteilung omitted (undefined)', () => {
    const rest: Record<string, unknown> = { ...validFirma };
    delete rest.abteilung;
    const result = auftraggeberSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'firma') {
      expect(result.data.abteilung).toBeNull();
    }
  });

  it('normalises whitespace-only abteilung to null', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, abteilung: '   ' });
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'firma') {
      expect(result.data.abteilung).toBeNull();
    }
  });

  it('trims surrounding whitespace from abteilung', () => {
    const result = auftraggeberSchema.safeParse({
      ...validFirma,
      abteilung: '  Wirtschaftliche Jugendhilfe  ',
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'firma') {
      expect(result.data.abteilung).toBe('Wirtschaftliche Jugendhilfe');
    }
  });

  it('forces abteilung to null on Person regardless of input', () => {
    const result = auftraggeberSchema.safeParse({
      ...validPerson,
      abteilung: 'Versuch einer Abteilung',
    });
    // Person hat keine Abteilung → entweder Reject oder Coerce-to-null.
    // Plan: z.null().or(z.undefined()).transform(() => null) → reject non-null.
    expect(result.success).toBe(false);
  });

  it('accepts Person with abteilung=null', () => {
    const result = auftraggeberSchema.safeParse({ ...validPerson, abteilung: null });
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'person') {
      expect(result.data.abteilung).toBeNull();
    }
  });

  it('accepts Person with abteilung omitted', () => {
    const rest: Record<string, unknown> = { ...validPerson };
    delete rest.abteilung;
    const result = auftraggeberSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'person') {
      expect(result.data.abteilung).toBeNull();
    }
  });
});

describe('auftraggeberSchema — rechnungskopfText (PRD §2.2, AC-AG-05)', () => {
  it('rejects an empty rechnungskopfText with "Rechnungskopf-Text ist Pflicht"', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, rechnungskopfText: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('rechnungskopfText'));
      expect(issue?.message).toBe('Rechnungskopf-Text ist Pflicht');
    }
  });

  it('rejects a whitespace-only rechnungskopfText with the same message', () => {
    const result = auftraggeberSchema.safeParse({ ...validFirma, rechnungskopfText: '   \n  ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('rechnungskopfText'));
      expect(issue?.message).toBe('Rechnungskopf-Text ist Pflicht');
    }
  });

  it('rejects a missing rechnungskopfText with the same message', () => {
    const rest: Record<string, unknown> = { ...validFirma };
    delete rest.rechnungskopfText;
    const result = auftraggeberSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('rechnungskopfText'));
      expect(issue?.message).toBe('Rechnungskopf-Text ist Pflicht');
    }
  });

  it('trims surrounding whitespace from rechnungskopfText', () => {
    const result = auftraggeberSchema.safeParse({
      ...validFirma,
      rechnungskopfText: '  Mein Honorar …  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rechnungskopfText).toBe('Mein Honorar …');
    }
  });

  it('requires rechnungskopfText for Person too', () => {
    const result = auftraggeberSchema.safeParse({ ...validPerson, rechnungskopfText: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('rechnungskopfText'));
      expect(issue?.message).toBe('Rechnungskopf-Text ist Pflicht');
    }
  });

  it('accepts a multiline rechnungskopfText', () => {
    const text = 'Zeile 1\nZeile 2\nZeile 3';
    const result = auftraggeberSchema.safeParse({ ...validFirma, rechnungskopfText: text });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rechnungskopfText).toBe(text);
    }
  });
});
