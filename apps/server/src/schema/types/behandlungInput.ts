import { builder } from '../builder';

export const BehandlungInputRef = builder.inputType('BehandlungInput', {
  fields: (t) => ({
    therapieId: t.id({ required: true }),
    datum: t.string({ required: true }),
    be: t.int({ required: true }),
    arbeitsthema: t.string({ required: false }),
  }),
});
