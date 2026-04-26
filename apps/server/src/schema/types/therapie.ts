import { eq, sql } from 'drizzle-orm';
import type { Therapie } from '../../db/schema';
import { behandlungen, kinder } from '../../db/schema';
import { builder } from '../builder';
import { KindRef } from './kind';
import { TaetigkeitEnum, TherapieFormEnum } from './enums';

export const TherapieRef = builder.objectRef<Therapie>('Therapie').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    kindId: t.exposeID('kindId'),
    auftraggeberId: t.exposeID('auftraggeberId'),
    form: t.field({ type: TherapieFormEnum, resolve: (r) => r.form }),
    kommentar: t.exposeString('kommentar', { nullable: true }),
    startdatum: t.string({ resolve: (r) => r.startdatum.toISOString().slice(0, 10) }),
    bewilligteBe: t.exposeInt('bewilligteBe'),
    taetigkeit: t.field({
      type: TaetigkeitEnum,
      nullable: true,
      resolve: (r) => r.taetigkeit,
    }),
    gruppentherapie: t.exposeBoolean('gruppentherapie'),
    geleisteteBe: t.int({
      resolve: (therapie, _args, { db }) => {
        const row = db
          .select({ total: sql<number>`COALESCE(SUM(${behandlungen.be}), 0)` })
          .from(behandlungen)
          .where(eq(behandlungen.therapieId, therapie.id))
          .get();
        return row?.total ?? 0;
      },
    }),
    kind: t.field({
      type: KindRef,
      nullable: true,
      resolve: (therapie, _args, { db }) =>
        db.select().from(kinder).where(eq(kinder.id, therapie.kindId)).get() ?? null,
    }),
    createdAt: t.string({ resolve: (r) => r.createdAt.toISOString() }),
    updatedAt: t.string({ resolve: (r) => r.updatedAt.toISOString() }),
  }),
});
