import type { TemplateFile } from '../../db/schema';
import { builder } from '../builder';
import { TemplateKindEnum } from './enums';

export const TemplateFileRef = builder.objectRef<TemplateFile>('TemplateFile').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.field({ type: TemplateKindEnum, resolve: (f) => f.kind }),
    auftraggeberId: t.exposeID('auftraggeberId', { nullable: true }),
    filename: t.exposeString('filename'),
    createdAt: t.string({ resolve: (f) => f.createdAt.toISOString() }),
  }),
});
