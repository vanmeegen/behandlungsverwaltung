import type { Behandlung } from '../../db/schema';
import { builder } from '../builder';

export const BehandlungRef = builder.objectRef<Behandlung>('Behandlung').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    therapieId: t.exposeID('therapieId'),
    datum: t.string({ resolve: (b) => b.datum.toISOString() }),
    be: t.exposeInt('be'),
    arbeitsthema: t.exposeString('arbeitsthema', { nullable: true }),
    createdAt: t.string({ resolve: (b) => b.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (b) => b.updatedAt.toISOString() }),
  }),
});
