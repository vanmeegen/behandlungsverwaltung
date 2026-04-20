import { z } from 'zod';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE_REGEX.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const geburtsdatumSchema = z
  .string({ error: 'Geburtsdatum ist Pflicht' })
  .min(1, 'Geburtsdatum ist Pflicht')
  .refine(isValidIsoDate, { error: 'Geburtsdatum ist ungültig' })
  .refine(
    (s) => {
      const today = new Date();
      const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
      return s <= todayIso;
    },
    { error: 'Geburtsdatum darf nicht in der Zukunft liegen' },
  );

export type Geburtsdatum = z.infer<typeof geburtsdatumSchema>;
