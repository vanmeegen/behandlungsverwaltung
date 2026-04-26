import type { Erziehungsberechtigter } from '../../db/schema';
import { builder } from '../builder';

export const ErziehungsberechtigterRef = builder
  .objectRef<Erziehungsberechtigter>('Erziehungsberechtigter')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      kindId: t.exposeID('kindId'),
      slot: t.exposeInt('slot'),
      vorname: t.exposeString('vorname'),
      nachname: t.exposeString('nachname'),
      strasse: t.exposeString('strasse', { nullable: true }),
      hausnummer: t.exposeString('hausnummer', { nullable: true }),
      plz: t.exposeString('plz', { nullable: true }),
      stadt: t.exposeString('stadt', { nullable: true }),
      email1: t.exposeString('email1', { nullable: true }),
      email2: t.exposeString('email2', { nullable: true }),
      telefon1: t.exposeString('telefon1', { nullable: true }),
      telefon2: t.exposeString('telefon2', { nullable: true }),
    }),
  });
