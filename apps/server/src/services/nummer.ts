import { generateRechnungsnummer } from '@behandlungsverwaltung/shared';
import type { Db } from '../db/client';
import { rechnungen } from '../db/schema';

export function allocateNummer(db: Db, year: number, month: number): string {
  const rows = db.select({ nummer: rechnungen.nummer }).from(rechnungen).all();
  const existing = rows.map((r) => r.nummer);
  return generateRechnungsnummer(existing, year, month);
}
