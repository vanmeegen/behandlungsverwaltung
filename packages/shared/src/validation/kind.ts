import { z } from 'zod';
import { aktenzeichenSchema } from './aktenzeichen';
import { addressSchema } from './address';
import { geburtsdatumSchema } from './geburtsdatum';
import { nachnameSchema } from './nachname';
import { vornameSchema } from './vorname';

export const kindSchema = z.object({
  vorname: vornameSchema,
  nachname: nachnameSchema,
  geburtsdatum: geburtsdatumSchema,
  strasse: addressSchema.shape.strasse,
  hausnummer: addressSchema.shape.hausnummer,
  plz: addressSchema.shape.plz,
  stadt: addressSchema.shape.stadt,
  aktenzeichen: aktenzeichenSchema,
});

export type KindInput = z.infer<typeof kindSchema>;
