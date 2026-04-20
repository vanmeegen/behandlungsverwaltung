import { builder } from '../builder';

export interface StundennachweisPayload {
  nummer: string;
  dateiname: string;
}

export const StundennachweisRef = builder
  .objectRef<StundennachweisPayload>('Stundennachweis')
  .implement({
    fields: (t) => ({
      nummer: t.exposeString('nummer'),
      dateiname: t.exposeString('dateiname'),
    }),
  });

export const CreateStundennachweisInputRef = builder.inputType('CreateStundennachweisInput', {
  fields: (t) => ({
    year: t.int({ required: true }),
    month: t.int({ required: true }),
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
  }),
});
