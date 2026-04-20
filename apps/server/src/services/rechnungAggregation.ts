import { and, asc, eq, gte, lt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { behandlungen, therapien, type Behandlung } from '../db/schema';

export class KeineBehandlungenError extends Error {
  constructor(year: number, month: number) {
    super(`Für ${String(year)}-${String(month).padStart(2, '0')} liegen keine Behandlungen vor`);
    this.name = 'KeineBehandlungenError';
  }
}

export interface CollectOpts {
  year: number;
  month: number;
  kindId: number;
  auftraggeberId: number;
}

function monthRange(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { from, to };
}

export function collectBehandlungen(db: Db, opts: CollectOpts): Behandlung[] {
  const { from, to } = monthRange(opts.year, opts.month);
  const rows = db
    .select({ b: behandlungen })
    .from(behandlungen)
    .innerJoin(therapien, eq(behandlungen.therapieId, therapien.id))
    .where(
      and(
        gte(behandlungen.datum, from),
        lt(behandlungen.datum, to),
        eq(therapien.kindId, opts.kindId),
        eq(therapien.auftraggeberId, opts.auftraggeberId),
      ),
    )
    .orderBy(asc(behandlungen.datum))
    .all();
  const mapped = rows.map((r) => r.b);
  if (mapped.length === 0) {
    throw new KeineBehandlungenError(opts.year, opts.month);
  }
  return mapped;
}
