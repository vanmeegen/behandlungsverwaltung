import { z } from 'zod';

export const aktenzeichenSchema = z
  .string({ error: 'Aktenzeichen ist Pflicht' })
  .min(1, 'Aktenzeichen ist Pflicht');

export type Aktenzeichen = z.infer<typeof aktenzeichenSchema>;
