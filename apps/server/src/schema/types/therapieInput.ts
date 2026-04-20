import { builder } from '../builder';
import { TherapieFormEnum } from './enums';

export const TherapieInputRef = builder.inputType('TherapieInput', {
  fields: (t) => ({
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
    form: t.field({ type: TherapieFormEnum, required: true }),
    kommentar: t.string({ required: false }),
    bewilligteBe: t.int({ required: true }),
    arbeitsthema: t.string({ required: false }),
  }),
});
