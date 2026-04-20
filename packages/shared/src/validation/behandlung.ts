import { z } from 'zod';

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

const arbeitsthemaSchema = z
  .string()
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

export const behandlungSchema = z.object({
  therapieId: idSchema,
  datum: z
    .string({ error: 'Datum ist Pflicht' })
    .min(1, 'Datum ist Pflicht')
    .refine(isValidIsoDate, { error: 'Datum ist ungültig' }),
  be: z.number({ error: 'BE muss ≥ 1 sein' }).int('BE muss ≥ 1 sein').min(1, 'BE muss ≥ 1 sein'),
  arbeitsthema: arbeitsthemaSchema,
});

export type BehandlungInputType = z.infer<typeof behandlungSchema>;
