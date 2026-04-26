import { z } from 'zod';
import { addressSchema } from './address';

const gruppeProzentSchema = z.number().int().min(0).max(100).nullish();
const gruppeStundensatzCentsSchema = z.number().int().min(0).nullish();

const gruppeFields = {
  gruppe1Prozent: gruppeProzentSchema,
  gruppe1StundensatzCents: gruppeStundensatzCentsSchema,
  gruppe2Prozent: gruppeProzentSchema,
  gruppe2StundensatzCents: gruppeStundensatzCentsSchema,
  gruppe3Prozent: gruppeProzentSchema,
  gruppe3StundensatzCents: gruppeStundensatzCentsSchema,
  gruppe4Prozent: gruppeProzentSchema,
  gruppe4StundensatzCents: gruppeStundensatzCentsSchema,
};

const stundensatzCentsSchema = z
  .number({ error: 'Stundensatz muss > 0 sein' })
  .int('Stundensatz muss > 0 sein')
  .positive('Stundensatz muss > 0 sein');

const abteilungOptionalSchema = z
  .string()
  .nullish()
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

const rechnungskopfTextSchema = z
  .string({ error: 'Rechnungskopf-Text ist Pflicht' })
  .superRefine((value, ctx) => {
    if (value.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rechnungskopf-Text ist Pflicht',
      });
    }
  })
  .transform((s) => s.trim());

const firmaSchema = z.object({
  typ: z.literal('firma'),
  firmenname: z.string({ error: 'Firmenname Pflicht' }).min(1, 'Firmenname Pflicht'),
  vorname: z.string().nullish(),
  nachname: z.string().nullish(),
  ...addressSchema.shape,
  stundensatzCents: stundensatzCentsSchema,
  abteilung: abteilungOptionalSchema,
  rechnungskopfText: rechnungskopfTextSchema,
  ...gruppeFields,
});

const personSchema = z.object({
  typ: z.literal('person'),
  firmenname: z.string().nullish(),
  vorname: z.string({ error: 'Vor- und Nachname Pflicht' }).min(1, 'Vor- und Nachname Pflicht'),
  nachname: z.string({ error: 'Vor- und Nachname Pflicht' }).min(1, 'Vor- und Nachname Pflicht'),
  ...addressSchema.shape,
  stundensatzCents: stundensatzCentsSchema,
  abteilung: z
    .null()
    .or(z.undefined())
    .transform(() => null),
  rechnungskopfText: rechnungskopfTextSchema,
  ...gruppeFields,
});

export const auftraggeberSchema = z.discriminatedUnion('typ', [firmaSchema, personSchema]);

export type AuftraggeberInputType = z.infer<typeof auftraggeberSchema>;
