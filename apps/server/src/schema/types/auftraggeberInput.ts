import { builder } from '../builder';
import { AuftraggeberTypEnum } from './enums';

export const AuftraggeberInputRef = builder.inputType('AuftraggeberInput', {
  fields: (t) => ({
    typ: t.field({ type: AuftraggeberTypEnum, required: true }),
    firmenname: t.string({ required: false }),
    vorname: t.string({ required: false }),
    nachname: t.string({ required: false }),
    strasse: t.string({ required: true }),
    hausnummer: t.string({ required: true }),
    plz: t.string({ required: true }),
    stadt: t.string({ required: true }),
    stundensatzCents: t.int({ required: true }),
    abteilung: t.string({ required: false }),
    rechnungskopfText: t.string({ required: true }),
  }),
});
