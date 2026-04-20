import { builder } from '../builder';

export const KindInputRef = builder.inputType('KindInput', {
  fields: (t) => ({
    vorname: t.string({ required: true }),
    nachname: t.string({ required: true }),
    geburtsdatum: t.string({ required: true }),
    strasse: t.string({ required: true }),
    hausnummer: t.string({ required: true }),
    plz: t.string({ required: true }),
    stadt: t.string({ required: true }),
    aktenzeichen: t.string({ required: true }),
  }),
});
