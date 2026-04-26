export const RECHNUNGSNUMMER_PREFIX = 'RE-';
export const STUNDENNACHWEIS_PREFIX = 'ST-';

const RECHNUNGSNUMMER_REGEX = /^RE-(\d{4})-(\d{2})-(\d{4})$/;

export interface ParsedRechnungsnummer {
  year: number;
  month: number;
  lfd: number;
}

export function parseRechnungsnummer(raw: string): ParsedRechnungsnummer {
  const match = RECHNUNGSNUMMER_REGEX.exec(raw);
  if (!match) {
    throw new Error(`Ungültige Rechnungsnummer: "${raw}"`);
  }
  return {
    year: Number.parseInt(match[1]!, 10),
    month: Number.parseInt(match[2]!, 10),
    lfd: Number.parseInt(match[3]!, 10),
  };
}

export function formatRechnungsnummer(year: number, month: number, lfd: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`Ungültiges Jahr: ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Ungültiger Monat: ${month}`);
  }
  if (!Number.isInteger(lfd) || lfd < 1 || lfd > 9999) {
    throw new Error(`Laufende Nummer außerhalb des Bereichs 1..9999: ${lfd}`);
  }
  return `${RECHNUNGSNUMMER_PREFIX}${year}-${String(month).padStart(2, '0')}-${String(lfd).padStart(4, '0')}`;
}

export function stundennachweisFileStem(rechnungsnummer: string): string {
  if (!rechnungsnummer.startsWith(RECHNUNGSNUMMER_PREFIX)) {
    throw new Error(
      `Rechnungsnummer muss mit "${RECHNUNGSNUMMER_PREFIX}" beginnen: ${rechnungsnummer}`,
    );
  }
  return STUNDENNACHWEIS_PREFIX + rechnungsnummer.slice(RECHNUNGSNUMMER_PREFIX.length);
}

/**
 * PRD §4 / AC-RECH-04: Liefert die nächste freie laufende Nummer (NNNN)
 * im Jahr `year`. Lücken werden **nicht** geschlossen — wir nehmen
 * `max + 1` der bestehenden NNNN. Falls noch keine Nummer für das Jahr
 * existiert, ist das Ergebnis `1`.
 */
export function nextFreeLfdNummer(existing: readonly string[], year: number): number {
  let maxLfdForYear = 0;
  for (const entry of existing) {
    const parsed = parseRechnungsnummer(entry);
    if (parsed.year !== year) continue;
    if (parsed.lfd > maxLfdForYear) maxLfdForYear = parsed.lfd;
  }
  return maxLfdForYear + 1;
}

export function generateRechnungsnummer(
  existing: readonly string[],
  year: number,
  month: number,
): string {
  return formatRechnungsnummer(year, month, nextFreeLfdNummer(existing, year));
}
