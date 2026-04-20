import { describe, expect, it } from 'bun:test';
import { addressSchema, plzSchema } from '../validation';

describe('plzSchema (AC-KIND-02 / AC-AG-03)', () => {
  it('rejects an empty string with "PLZ ist Pflicht"', () => {
    const result = plzSchema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('PLZ ist Pflicht');
    }
  });

  it('rejects non-digits like "abcde"', () => {
    const result = plzSchema.safeParse('abcde');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('PLZ muss fünf Ziffern enthalten');
    }
  });

  it('rejects a 4-digit PLZ', () => {
    const result = plzSchema.safeParse('1234');
    expect(result.success).toBe(false);
  });

  it('rejects a 6-digit PLZ', () => {
    const result = plzSchema.safeParse('123456');
    expect(result.success).toBe(false);
  });

  it('rejects undefined with "PLZ ist Pflicht"', () => {
    const result = plzSchema.safeParse(undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('PLZ ist Pflicht');
    }
  });

  it('accepts a valid 5-digit PLZ', () => {
    const result = plzSchema.safeParse('50667');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('50667');
    }
  });
});

describe('addressSchema', () => {
  const valid = {
    strasse: 'Hauptstr.',
    hausnummer: '12',
    plz: '50667',
    stadt: 'Köln',
  };

  it('accepts a fully populated address', () => {
    const result = addressSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a missing plz with "PLZ ist Pflicht"', () => {
    const result = addressSchema.safeParse({ ...valid, plz: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const plzIssue = result.error.issues.find((i) => i.path.includes('plz'));
      expect(plzIssue?.message).toBe('PLZ ist Pflicht');
    }
  });

  it('rejects missing strasse', () => {
    const result = addressSchema.safeParse({ ...valid, strasse: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('strasse'));
      expect(issue?.message).toBe('Straße ist Pflicht');
    }
  });

  it('rejects missing hausnummer', () => {
    const result = addressSchema.safeParse({ ...valid, hausnummer: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('hausnummer'));
      expect(issue?.message).toBe('Hausnummer ist Pflicht');
    }
  });

  it('rejects missing stadt', () => {
    const result = addressSchema.safeParse({ ...valid, stadt: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('stadt'));
      expect(issue?.message).toBe('Stadt ist Pflicht');
    }
  });

  it('propagates the PLZ regex message when plz is non-digit', () => {
    const result = addressSchema.safeParse({ ...valid, plz: 'abcde' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('plz'));
      expect(issue?.message).toBe('PLZ muss fünf Ziffern enthalten');
    }
  });
});
