const RECHNUNGSNUMMER_REGEX = /^(\d{4})-(\d{2})-(\d{4})$/;

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
  return `${year}-${String(month).padStart(2, '0')}-${String(lfd).padStart(4, '0')}`;
}

export function generateRechnungsnummer(
  existing: readonly string[],
  year: number,
  month: number,
): string {
  let maxLfdForYear = 0;
  for (const entry of existing) {
    const parsed = parseRechnungsnummer(entry);
    if (parsed.year !== year) continue;
    if (parsed.lfd > maxLfdForYear) maxLfdForYear = parsed.lfd;
  }
  return formatRechnungsnummer(year, month, maxLfdForYear + 1);
}
