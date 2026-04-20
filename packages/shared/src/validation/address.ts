import { z } from 'zod';
import { plzSchema } from './plz';

export const addressSchema = z.object({
  strasse: z.string({ error: 'Straße ist Pflicht' }).min(1, 'Straße ist Pflicht'),
  hausnummer: z.string({ error: 'Hausnummer ist Pflicht' }).min(1, 'Hausnummer ist Pflicht'),
  plz: plzSchema,
  stadt: z.string({ error: 'Stadt ist Pflicht' }).min(1, 'Stadt ist Pflicht'),
});

export type Address = z.infer<typeof addressSchema>;
