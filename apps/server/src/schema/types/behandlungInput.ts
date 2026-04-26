import { builder } from '../builder';
import { TaetigkeitEnum } from './enums';

export const BehandlungInputRef = builder.inputType('BehandlungInput', {
  fields: (t) => ({
    therapieId: t.id({ required: true }),
    datum: t.string({ required: true }),
    be: t.int({ required: true }),
    taetigkeit: t.field({ type: TaetigkeitEnum, required: false }),
    gruppentherapie: t.boolean({ required: false }),
  }),
});
