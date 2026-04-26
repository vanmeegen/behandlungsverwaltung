import { z } from 'zod';

export const erziehungsberechtigterSchema = z
  .object({
    slot: z.union([z.literal(1), z.literal(2)]),
    vorname: z.string().min(1, 'Vorname ist Pflicht'),
    nachname: z.string().min(1, 'Nachname ist Pflicht'),
    strasse: z.string().nullish(),
    hausnummer: z.string().nullish(),
    plz: z.string().nullish(),
    stadt: z.string().nullish(),
    email1: z.string().email().nullish(),
    email2: z.string().email().nullish(),
    telefon1: z.string().nullish(),
    telefon2: z.string().nullish(),
  })
  .superRefine((data, ctx) => {
    const hasAny =
      (data.strasse && data.strasse.trim().length > 0) ||
      (data.hausnummer && data.hausnummer.trim().length > 0) ||
      (data.plz && data.plz.trim().length > 0) ||
      (data.stadt && data.stadt.trim().length > 0);
    if (!hasAny) return;
    if (!data.strasse || data.strasse.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['strasse'], message: 'Straße ist Pflicht' });
    }
    if (!data.hausnummer || data.hausnummer.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['hausnummer'], message: 'Hausnummer ist Pflicht' });
    }
    if (!data.plz || data.plz.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['plz'], message: 'PLZ ist Pflicht' });
    }
    if (!data.stadt || data.stadt.trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['stadt'], message: 'Stadt ist Pflicht' });
    }
  });

export type ErziehungsberechtigterInputType = z.infer<typeof erziehungsberechtigterSchema>;
