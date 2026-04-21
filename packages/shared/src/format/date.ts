const MONATSNAMEN = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDateDe(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function monatName(month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`monatName requires 1..12, got: ${month}`);
  }
  return MONATSNAMEN[month - 1]!;
}

export function formatLeistungszeitraum(year: number, month: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`formatLeistungszeitraum: invalid year ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`formatLeistungszeitraum: invalid month ${month}`);
  }
  const lastDay = new Date(year, month, 0).getDate();
  return `${pad2(1)}.${pad2(month)}.${year} – ${pad2(lastDay)}.${pad2(month)}.${year}`;
}
