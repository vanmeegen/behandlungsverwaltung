import { builder } from '../builder';

export const CreateMonatsrechnungInputRef = builder.inputType('CreateMonatsrechnungInput', {
  fields: (t) => ({
    year: t.int({ required: true }),
    month: t.int({ required: true }),
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
    // ISO-Datum YYYY-MM-DD; vom Nutzer eingegeben, Default heute.
    rechnungsdatum: t.string({ required: true }),
    // PRD §3.2: Bei bereits bestehender Rechnung erwartet der Server eine
    // explizite Bestätigung durch force=true, um die Rechnung neu zu erzeugen.
    // Die Rechnungsnummer bleibt dabei erhalten (§4).
    force: t.boolean({ required: false }),
    // PRD §3.2 / AC-RECH-15: Optional manuell gewählte laufende Nummer (NNNN)
    // im Bereich 1..9999. Falls weggelassen, wird sie wie bisher serverseitig
    // als max+1 ermittelt. Der Präfix `RE-YYYY-MM-` wird in jedem Fall vom
    // Server bestimmt. Bei `force=true` (Korrektur) wird der Override
    // ignoriert (Nummer bleibt unverändert).
    lfdNummer: t.int({ required: false }),
  }),
});
