import { builder } from '../builder';
import { TemplateKindEnum } from './enums';

export const UploadTemplateInputRef = builder.inputType('UploadTemplateInput', {
  fields: (t) => ({
    kind: t.field({ type: TemplateKindEnum, required: true }),
    auftraggeberId: t.id({ required: false }),
    base64: t.string({ required: true }),
  }),
});
