import { z } from 'zod';

export const vornameSchema = z
  .string({ error: 'Vorname ist Pflicht' })
  .min(1, 'Vorname ist Pflicht');

export type Vorname = z.infer<typeof vornameSchema>;
