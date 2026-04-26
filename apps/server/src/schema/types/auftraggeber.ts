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
    abteilung: t.exposeString('abteilung', { nullable: true }),
    rechnungskopfText: t.exposeString('rechnungskopfText'),
    gruppe1Prozent: t.exposeInt('gruppe1Prozent', { nullable: true }),
    gruppe1StundensatzCents: t.exposeInt('gruppe1StundensatzCents', { nullable: true }),
    gruppe2Prozent: t.exposeInt('gruppe2Prozent', { nullable: true }),
    gruppe2StundensatzCents: t.exposeInt('gruppe2StundensatzCents', { nullable: true }),
    gruppe3Prozent: t.exposeInt('gruppe3Prozent', { nullable: true }),
    gruppe3StundensatzCents: t.exposeInt('gruppe3StundensatzCents', { nullable: true }),
    gruppe4Prozent: t.exposeInt('gruppe4Prozent', { nullable: true }),
    gruppe4StundensatzCents: t.exposeInt('gruppe4StundensatzCents', { nullable: true }),
    createdAt: t.string({ resolve: (a) => a.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (a) => a.updatedAt.toISOString() }),
  }),
});
