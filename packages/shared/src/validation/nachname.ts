import { z } from 'zod';

export const nachnameSchema = z
  .string({ error: 'Nachname ist Pflicht' })
  .min(1, 'Nachname ist Pflicht');

export type Nachname = z.infer<typeof nachnameSchema>;
