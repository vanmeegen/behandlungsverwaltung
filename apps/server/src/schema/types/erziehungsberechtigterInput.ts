import { builder } from '../builder';

export const ErziehungsberechtigterInputRef = builder.inputType('ErziehungsberechtigterInput', {
  fields: (t) => ({
    kindId: t.id({ required: true }),
    slot: t.int({ required: true }),
    vorname: t.string({ required: true }),
    nachname: t.string({ required: true }),
    strasse: t.string({ required: false }),
    hausnummer: t.string({ required: false }),
    plz: t.string({ required: false }),
    stadt: t.string({ required: false }),
    email1: t.string({ required: false }),
    email2: t.string({ required: false }),
    telefon1: t.string({ required: false }),
    telefon2: t.string({ required: false }),
  }),
});
