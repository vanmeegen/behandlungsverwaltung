import { z } from 'zod';

export const plzSchema = z
  .string({ error: 'PLZ ist Pflicht' })
  .min(1, 'PLZ ist Pflicht')
  .regex(/^\d{5}$/, 'PLZ muss fünf Ziffern enthalten');

export type Plz = z.infer<typeof plzSchema>;
