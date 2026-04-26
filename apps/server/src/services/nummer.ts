import {
  formatRechnungsnummer,
  generateRechnungsnummer,
  nextFreeLfdNummer,
} from '@behandlungsverwaltung/shared';
import type { Db } from '../db/client';
import { rechnungen } from '../db/schema';

/**
 * Wird vom Service geworfen, wenn der Nutzer eine bereits im selben Jahr
 * vergebene laufende Nummer (NNNN) explizit übergibt. PRD §3.2 / AC-RECH-15.
 */
export class RechnungsnummerDuplicateError extends Error {
  readonly year: number;
  readonly lfd: number;
  constructor(year: number, lfd: number) {
    super(`Rechnungsnummer RE-${year}-…-${String(lfd).padStart(4, '0')} ist bereits vergeben.`);
    this.name = 'RechnungsnummerDuplicateError';
    this.year = year;
    this.lfd = lfd;
  }
}

function loadExistingNummern(db: Db): string[] {
  const rows = db.select({ nummer: rechnungen.nummer }).from(rechnungen).all();
  return rows.map((r) => r.nummer);
}

export function allocateNummer(db: Db, year: number, month: number): string {
  const existing = loadExistingNummern(db);
  return generateRechnungsnummer(existing, year, month);
}

/**
 * Wenn `lfdNummer` weggelassen wird, verhält sich die Funktion wie
 * {@link allocateNummer} (max+1 für das Jahr).
 *
 * Wenn `lfdNummer` angegeben wird, prüft sie auf Kollision mit allen
 * bestehenden Rechnungen im selben Jahr. Bei Kollision wird
 * {@link RechnungsnummerDuplicateError} geworfen.
 */
export function allocateOrUseNummer(
  db: Db,
  year: number,
  month: number,
  lfdNummer?: number,
): string {
  const existing = loadExistingNummern(db);
  if (lfdNummer === undefined) {
    return formatRechnungsnummer(year, month, nextFreeLfdNummer(existing, year));
  }
  for (const entry of existing) {
    // parsen wäre korrekt, aber bei jeder Anlage haben wir saubere Strings.
    // Wir vergleichen direkt nach `RE-YYYY-` Präfix + NNNN-Suffix.
    if (
      entry.startsWith(`RE-${year}-`) &&
      entry.endsWith(`-${String(lfdNummer).padStart(4, '0')}`)
    ) {
      throw new RechnungsnummerDuplicateError(year, lfdNummer);
    }
  }
  return formatRechnungsnummer(year, month, lfdNummer);
}
