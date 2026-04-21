import type { Therapie } from '../../db/schema';
import { builder } from '../builder';
import { TaetigkeitEnum, TherapieFormEnum } from './enums';

export const TherapieRef = builder.objectRef<Therapie>('Therapie').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    kindId: t.exposeID('kindId'),
    auftraggeberId: t.exposeID('auftraggeberId'),
    form: t.field({ type: TherapieFormEnum, resolve: (r) => r.form }),
    kommentar: t.exposeString('kommentar', { nullable: true }),
    bewilligteBe: t.exposeInt('bewilligteBe'),
    taetigkeit: t.field({
      type: TaetigkeitEnum,
      nullable: true,
      resolve: (r) => r.taetigkeit,
    }),
    createdAt: t.string({ resolve: (r) => r.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (r) => r.updatedAt.toISOString() }),
  }),
});
