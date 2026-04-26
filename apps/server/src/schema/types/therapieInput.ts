import { builder } from '../builder';
import { TaetigkeitEnum, TherapieFormEnum } from './enums';

export const TherapieInputRef = builder.inputType('TherapieInput', {
  fields: (t) => ({
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
    form: t.field({ type: TherapieFormEnum, required: true }),
    kommentar: t.string({ required: false }),
    startdatum: t.string({ required: true }),
    bewilligteBe: t.int({ required: true }),
    taetigkeit: t.field({ type: TaetigkeitEnum, required: false }),
    gruppentherapie: t.boolean({ required: false }),
  }),
});
