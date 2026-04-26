import { describe, expect, it } from 'bun:test';
import { behandlungSchema } from '../validation';

const base = {
  therapieId: '1',
  datum: '2026-04-15',
  be: 2,
  taetigkeit: 'lerntherapie',
};

describe('behandlungSchema (PRD §2.4, AC-BEH-02)', () => {
  it('accepts a fully valid Behandlung', () => {
    expect(behandlungSchema.safeParse(base).success).toBe(true);
  });

  it('rejects be = 0 with "BE muss ≥ 1 sein"', () => {
    const result = behandlungSchema.safeParse({ ...base, be: 0 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('BE muss ≥ 1 sein');
  });

  it('rejects negative be', () => {
    expect(behandlungSchema.safeParse({ ...base, be: -1 }).success).toBe(false);
  });

  it('rejects non-integer be', () => {
    expect(behandlungSchema.safeParse({ ...base, be: 1.5 }).success).toBe(false);
  });

  it('rejects malformed datum', () => {
    const result = behandlungSchema.safeParse({ ...base, datum: '15.04.2026' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Datum ist ungültig');
  });

  it('rejects empty datum', () => {
    const result = behandlungSchema.safeParse({ ...base, datum: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Datum ist Pflicht');
  });

  it('trims whitespace-only taetigkeit to null', () => {
    const result = behandlungSchema.safeParse({ ...base, taetigkeit: '   ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.taetigkeit).toBeNull();
  });

  it('accepts null taetigkeit', () => {
    const result = behandlungSchema.safeParse({ ...base, taetigkeit: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.taetigkeit).toBeNull();
  });

  it('accepts gruppentherapie as boolean true', () => {
    const result = behandlungSchema.safeParse({ ...base, gruppentherapie: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.gruppentherapie).toBe(true);
  });

  it('accepts gruppentherapie as boolean false', () => {
    const result = behandlungSchema.safeParse({ ...base, gruppentherapie: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.gruppentherapie).toBe(false);
  });

  it('accepts gruppentherapie omitted (undefined → resolver fills from Therapie)', () => {
    const result = behandlungSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(
        result.data.gruppentherapie === null || result.data.gruppentherapie === undefined,
      ).toBe(true);
    }
  });

  it('accepts gruppentherapie explicitly null', () => {
    const result = behandlungSchema.safeParse({ ...base, gruppentherapie: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(
        result.data.gruppentherapie === null || result.data.gruppentherapie === undefined,
      ).toBe(true);
    }
  });

  it('rejects gruppentherapie as a non-boolean string', () => {
    const result = behandlungSchema.safeParse({ ...base, gruppentherapie: 'yes' as unknown });
    expect(result.success).toBe(false);
  });
});
