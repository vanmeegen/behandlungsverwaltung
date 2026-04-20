import { z } from 'zod';

export const THERAPIE_FORM_VALUES = [
  'dyskalkulie',
  'lerntherapie',
  'heilpaedagogik',
  'elternberatung',
  'sonstiges',
] as const;

export type TherapieFormValue = (typeof THERAPIE_FORM_VALUES)[number];

const idSchema = z
  .union([z.string().min(1), z.number().int().positive()], { error: 'ID ist Pflicht' })
  .transform((v) => String(v));

const arbeitsthemaSchema = z
  .string()
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
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
    arbeitsthema: arbeitsthemaSchema,
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
