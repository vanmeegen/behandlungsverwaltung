import { builder } from '../builder';

export const CreateMonatsrechnungInputRef = builder.inputType('CreateMonatsrechnungInput', {
  fields: (t) => ({
    year: t.int({ required: true }),
    month: t.int({ required: true }),
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
  }),
});
