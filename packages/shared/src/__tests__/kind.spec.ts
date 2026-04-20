import { describe, expect, it } from 'bun:test';
import {
  aktenzeichenSchema,
  geburtsdatumSchema,
  kindSchema,
  nachnameSchema,
  vornameSchema,
} from '../validation';

describe('vornameSchema (PRD §2.1)', () => {
  it('rejects empty string with "Vorname ist Pflicht"', () => {
    const r = vornameSchema.safeParse('');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Vorname ist Pflicht');
  });

  it('rejects undefined with "Vorname ist Pflicht"', () => {
    const r = vornameSchema.safeParse(undefined);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Vorname ist Pflicht');
  });

  it('accepts "Anna"', () => {
    const r = vornameSchema.safeParse('Anna');
    expect(r.success).toBe(true);
  });
});

describe('nachnameSchema (PRD §2.1)', () => {
  it('rejects empty string with "Nachname ist Pflicht"', () => {
    const r = nachnameSchema.safeParse('');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Nachname ist Pflicht');
  });

  it('accepts "Musterfrau"', () => {
    const r = nachnameSchema.safeParse('Musterfrau');
    expect(r.success).toBe(true);
  });
});

describe('aktenzeichenSchema (PRD §2.1)', () => {
  it('rejects empty string with "Aktenzeichen ist Pflicht"', () => {
    const r = aktenzeichenSchema.safeParse('');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Aktenzeichen ist Pflicht');
  });

  it('accepts "K-2026-001"', () => {
    const r = aktenzeichenSchema.safeParse('K-2026-001');
    expect(r.success).toBe(true);
  });
});

describe('geburtsdatumSchema (PRD §2.1)', () => {
  it('rejects empty string with "Geburtsdatum ist Pflicht"', () => {
    const r = geburtsdatumSchema.safeParse('');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Geburtsdatum ist Pflicht');
  });

  it('rejects undefined with "Geburtsdatum ist Pflicht"', () => {
    const r = geburtsdatumSchema.safeParse(undefined);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Geburtsdatum ist Pflicht');
  });

  it('rejects "14.03.2018" (wrong format) with "Geburtsdatum ist ungültig"', () => {
    const r = geburtsdatumSchema.safeParse('14.03.2018');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Geburtsdatum ist ungültig');
  });

  it('rejects "2018-13-40" (impossible date) with "Geburtsdatum ist ungültig"', () => {
    const r = geburtsdatumSchema.safeParse('2018-13-40');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Geburtsdatum ist ungültig');
  });

  it('rejects a future date with "Geburtsdatum darf nicht in der Zukunft liegen"', () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = geburtsdatumSchema.safeParse(future);
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues[0]?.message).toBe('Geburtsdatum darf nicht in der Zukunft liegen');
  });

  it('accepts "2018-03-14"', () => {
    const r = geburtsdatumSchema.safeParse('2018-03-14');
    expect(r.success).toBe(true);
  });

  it('accepts today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = geburtsdatumSchema.safeParse(today);
    expect(r.success).toBe(true);
  });
});

describe('kindSchema (composite, PRD §2.1)', () => {
  const valid = {
    vorname: 'Anna',
    nachname: 'Musterfrau',
    geburtsdatum: '2018-03-14',
    strasse: 'Hauptstr.',
    hausnummer: '12',
    plz: '50667',
    stadt: 'Köln',
    aktenzeichen: 'K-2026-001',
  };

  it('accepts all 8 valid fields', () => {
    const r = kindSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('rejects missing plz with "PLZ ist Pflicht"', () => {
    const r = kindSchema.safeParse({ ...valid, plz: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.includes('plz'));
      expect(issue?.message).toBe('PLZ ist Pflicht');
    }
  });

  it('rejects missing vorname', () => {
    const r = kindSchema.safeParse({ ...valid, vorname: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.includes('vorname'));
      expect(issue?.message).toBe('Vorname ist Pflicht');
    }
  });

  it('rejects missing geburtsdatum', () => {
    const r = kindSchema.safeParse({ ...valid, geburtsdatum: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path.includes('geburtsdatum'));
      expect(issue?.message).toBe('Geburtsdatum ist Pflicht');
    }
  });
});
