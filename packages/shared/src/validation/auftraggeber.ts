import { z } from 'zod';
import { addressSchema } from './address';

const stundensatzCentsSchema = z
  .number({ error: 'Stundensatz muss > 0 sein' })
  .int('Stundensatz muss > 0 sein')
  .positive('Stundensatz muss > 0 sein');

const firmaSchema = z.object({
  typ: z.literal('firma'),
  firmenname: z.string({ error: 'Firmenname Pflicht' }).min(1, 'Firmenname Pflicht'),
  vorname: z.string().nullish(),
  nachname: z.string().nullish(),
  ...addressSchema.shape,
  stundensatzCents: stundensatzCentsSchema,
});

const personSchema = z.object({
  typ: z.literal('person'),
  firmenname: z.string().nullish(),
  vorname: z.string({ error: 'Vor- und Nachname Pflicht' }).min(1, 'Vor- und Nachname Pflicht'),
  nachname: z.string({ error: 'Vor- und Nachname Pflicht' }).min(1, 'Vor- und Nachname Pflicht'),
  ...addressSchema.shape,
  stundensatzCents: stundensatzCentsSchema,
});

export const auftraggeberSchema = z.discriminatedUnion('typ', [firmaSchema, personSchema]);

export type AuftraggeberInputType = z.infer<typeof auftraggeberSchema>;
