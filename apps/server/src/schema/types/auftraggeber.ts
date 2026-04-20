import type { Auftraggeber } from '../../db/schema';
import { builder } from '../builder';
import { AuftraggeberTypEnum } from './enums';

export const AuftraggeberRef = builder.objectRef<Auftraggeber>('Auftraggeber').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    typ: t.field({ type: AuftraggeberTypEnum, resolve: (a) => a.typ }),
    firmenname: t.exposeString('firmenname', { nullable: true }),
    vorname: t.exposeString('vorname', { nullable: true }),
    nachname: t.exposeString('nachname', { nullable: true }),
    strasse: t.exposeString('strasse'),
    hausnummer: t.exposeString('hausnummer'),
    plz: t.exposeString('plz'),
    stadt: t.exposeString('stadt'),
    stundensatzCents: t.exposeInt('stundensatzCents'),
    createdAt: t.string({ resolve: (a) => a.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (a) => a.updatedAt.toISOString() }),
  }),
});
