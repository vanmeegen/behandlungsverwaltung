import { describe, expect, it } from 'bun:test';
import { therapieSchema } from '../validation';

const baseValid = {
  kindId: '1',
  auftraggeberId: '2',
  form: 'lerntherapie' as const,
  kommentar: null,
  bewilligteBe: 60,
  taetigkeit: null,
};

describe('therapieSchema (PRD §2.3, AC-TH-01)', () => {
  it('accepts a fully valid Lerntherapie', () => {
    const result = therapieSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('rejects unknown form', () => {
    const result = therapieSchema.safeParse({ ...baseValid, form: 'logopaedie' });
    expect(result.success).toBe(false);
  });

  it('rejects form=sonstiges without kommentar with "Kommentar ist Pflicht bei Sonstiges"', () => {
    const result = therapieSchema.safeParse({ ...baseValid, form: 'sonstiges', kommentar: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Kommentar ist Pflicht bei Sonstiges');
    }
  });

  it('rejects form=sonstiges with only whitespace kommentar', () => {
    const result = therapieSchema.safeParse({
      ...baseValid,
      form: 'sonstiges',
      kommentar: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('accepts form=sonstiges with kommentar', () => {
    const result = therapieSchema.safeParse({
      ...baseValid,
      form: 'sonstiges',
      kommentar: 'Individuell abgestimmte Förderung',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kommentar).toBe('Individuell abgestimmte Förderung');
    }
  });

  it('ignores kommentar for non-sonstiges forms but keeps it in the output', () => {
    const result = therapieSchema.safeParse({
      ...baseValid,
      form: 'lerntherapie',
      kommentar: 'irrelevant',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kommentar).toBe('irrelevant');
    }
  });

  it('rejects bewilligteBe = 0', () => {
    const result = therapieSchema.safeParse({ ...baseValid, bewilligteBe: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Bewilligte Behandlungseinheiten müssen > 0 sein',
      );
    }
  });

  it('rejects non-integer bewilligteBe', () => {
    const result = therapieSchema.safeParse({ ...baseValid, bewilligteBe: 12.5 });
    expect(result.success).toBe(false);
  });

  it('trims whitespace-only taetigkeit to null', () => {
    const result = therapieSchema.safeParse({ ...baseValid, taetigkeit: '   ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taetigkeit).toBeNull();
    }
  });

  it('keeps a valid enum taetigkeit and trims outer whitespace', () => {
    const result = therapieSchema.safeParse({
      ...baseValid,
      taetigkeit: '  lerntherapie  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taetigkeit).toBe('lerntherapie');
    }
  });

  it('normalises a non-enum taetigkeit string to null', () => {
    const result = therapieSchema.safeParse({
      ...baseValid,
      taetigkeit: 'Mathe-Grundlagen',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taetigkeit).toBeNull();
    }
  });

  it('coerces numeric kindId / auftraggeberId to string', () => {
    const result = therapieSchema.safeParse({ ...baseValid, kindId: 1, auftraggeberId: 2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kindId).toBe('1');
      expect(result.data.auftraggeberId).toBe('2');
    }
  });
});
