import type { Kind } from '../../db/schema';
import { builder } from '../builder';

export const KindRef = builder.objectRef<Kind>('Kind').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    vorname: t.exposeString('vorname'),
    nachname: t.exposeString('nachname'),
    geburtsdatum: t.string({ resolve: (k) => k.geburtsdatum.toISOString() }),
    strasse: t.exposeString('strasse'),
    hausnummer: t.exposeString('hausnummer'),
    plz: t.exposeString('plz'),
    stadt: t.exposeString('stadt'),
    aktenzeichen: t.exposeString('aktenzeichen'),
    createdAt: t.string({ resolve: (k) => k.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (k) => k.updatedAt.toISOString() }),
  }),
});
