import { z } from 'zod';
import { TAETIGKEIT_VALUES } from './taetigkeit';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE_REGEX.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const idSchema = z
  .union([z.string().min(1), z.number().int().positive()], { error: 'Therapie-ID ist Pflicht' })
  .transform((v) => String(v));

// Tätigkeit im Behandlungs-Input ist optional: fehlt sie, übernimmt der
// Resolver die Tätigkeit der zugehörigen Therapie (§2.4). Freitext-Altwerte
// werden auf null normalisiert.
const taetigkeitInputSchema = z
  .string()
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    return (TAETIGKEIT_VALUES as readonly string[]).includes(trimmed)
      ? (trimmed as (typeof TAETIGKEIT_VALUES)[number])
      : null;
  });

export const behandlungSchema = z
  .object({
    therapieId: idSchema,
    datum: z
      .string({ error: 'Datum ist Pflicht' })
      .min(1, 'Datum ist Pflicht')
      .refine(isValidIsoDate, { error: 'Datum ist ungültig' }),
    be: z.number({ error: 'BE muss ≥ 1 sein' }).int('BE muss ≥ 1 sein').min(1, 'BE muss ≥ 1 sein'),
    taetigkeit: taetigkeitInputSchema,
    gruppentherapie: z.boolean().nullish(),
    sonstigesText: z.string().trim().max(35, 'Sonstiges-Text: max. 35 Zeichen').nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.taetigkeit === 'sonstiges') {
      if (!data.sonstigesText || data.sonstigesText.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['sonstigesText'],
          message: 'Beschreibung Pflicht bei Sonstiges',
        });
      }
    } else if (data.sonstigesText && data.sonstigesText.trim().length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sonstigesText'],
        message: 'Sonstiges-Freitext nur bei Tätigkeit Sonstiges',
      });
    }
  });

export type BehandlungInputType = z.infer<typeof behandlungSchema>;
