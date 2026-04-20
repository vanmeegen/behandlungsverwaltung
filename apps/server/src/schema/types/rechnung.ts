import type { Rechnung } from '../../db/schema';
import { builder } from '../builder';

export const RechnungRef = builder.objectRef<Rechnung>('Rechnung').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    nummer: t.exposeString('nummer'),
    jahr: t.exposeInt('jahr'),
    monat: t.exposeInt('monat'),
    kindId: t.exposeID('kindId'),
    auftraggeberId: t.exposeID('auftraggeberId'),
    stundensatzCentsSnapshot: t.exposeInt('stundensatzCentsSnapshot'),
    gesamtCents: t.exposeInt('gesamtCents'),
    dateiname: t.exposeString('dateiname'),
    createdAt: t.string({ resolve: (r) => r.createdAt.toISOString() }),
  }),
});
