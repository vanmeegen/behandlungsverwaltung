import { builder } from '../builder';

export const CreateMonatsrechnungInputRef = builder.inputType('CreateMonatsrechnungInput', {
  fields: (t) => ({
    year: t.int({ required: true }),
    month: t.int({ required: true }),
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
    // PRD §3.2: Bei bereits bestehender Rechnung erwartet der Server eine
    // explizite Bestätigung durch force=true, um die Rechnung neu zu erzeugen.
    // Die Rechnungsnummer bleibt dabei erhalten (§4).
    force: t.boolean({ required: false }),
  }),
});
