import { z } from 'zod';
import { TAETIGKEIT_VALUES } from './taetigkeit';
import { THERAPIE_FORM_VALUES, type TherapieFormValue } from './therapieFormValues';

export { THERAPIE_FORM_VALUES, type TherapieFormValue };

const idSchema = z
  .union([z.string().min(1), z.number().int().positive()], { error: 'ID ist Pflicht' })
  .transform((v) => String(v));

// Tätigkeit ist optional auf Therapie-Ebene: sie dient nur als Vorbelegung
// für daraus erfasste Behandlungen (§2.3/§2.4). Nicht-Enum-Werte aus
// Freitext-Altbeständen werden auf null abgebildet.
const taetigkeitNullableSchema = z
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

const kommentarSchema = z
  .string()
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

export const therapieSchema = z
  .object({
    kindId: idSchema,
    auftraggeberId: idSchema,
    form: z.enum(THERAPIE_FORM_VALUES, {
      error: 'Therapieform ist ungültig',
    }),
    kommentar: kommentarSchema,
    bewilligteBe: z
      .number({ error: 'Bewilligte Behandlungseinheiten müssen > 0 sein' })
      .int('Bewilligte Behandlungseinheiten müssen > 0 sein')
      .positive('Bewilligte Behandlungseinheiten müssen > 0 sein'),
    taetigkeit: taetigkeitNullableSchema,
  })
  .superRefine((data, ctx) => {
    if (data.form === 'sonstiges' && !data.kommentar) {
      ctx.addIssue({
        code: 'custom',
        path: ['kommentar'],
        message: 'Kommentar ist Pflicht bei Sonstiges',
      });
    }
  });

export type TherapieInputType = z.infer<typeof therapieSchema>;
