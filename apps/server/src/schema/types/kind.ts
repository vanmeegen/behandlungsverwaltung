import { asc, eq } from 'drizzle-orm';
import type { Kind } from '../../db/schema';
import { erziehungsberechtigte } from '../../db/schema';
import { builder } from '../builder';
import { ErziehungsberechtigterRef } from './erziehungsberechtigterType';

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
    erziehungsberechtigte: t.field({
      type: [ErziehungsberechtigterRef],
      resolve: (kind, _args, { db }) =>
        db
          .select()
          .from(erziehungsberechtigte)
          .where(eq(erziehungsberechtigte.kindId, kind.id))
          .orderBy(asc(erziehungsberechtigte.slot))
          .all(),
    }),
    createdAt: t.string({ resolve: (k) => k.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (k) => k.updatedAt.toISOString() }),
  }),
});
