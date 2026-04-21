import type { Behandlung } from '../../db/schema';
import { builder } from '../builder';
import { TaetigkeitEnum } from './enums';

export const BehandlungRef = builder.objectRef<Behandlung>('Behandlung').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    therapieId: t.exposeID('therapieId'),
    datum: t.string({ resolve: (b) => b.datum.toISOString() }),
    be: t.exposeInt('be'),
    taetigkeit: t.field({
      type: TaetigkeitEnum,
      nullable: true,
      resolve: (b) => b.taetigkeit,
    }),
    createdAt: t.string({ resolve: (b) => b.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (b) => b.updatedAt.toISOString() }),
  }),
});
