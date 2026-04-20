const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae',
  Ä: 'Ae',
  ö: 'oe',
  Ö: 'Oe',
  ü: 'ue',
  Ü: 'Ue',
  ß: 'ss',
};

function foldUmlauts(input: string): string {
  let out = '';
  for (const ch of input) {
    out += UMLAUT_MAP[ch] ?? ch;
  }
  return out;
}

function asciiFold(input: string): string {
  return foldUmlauts(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sanitizeSegment(input: string): string {
  return asciiFold(input)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function sanitizeKindesname(vorname: string, nachname: string): string {
  const v = sanitizeSegment(vorname);
  const n = sanitizeSegment(nachname);
  if (!v && !n) return 'Unbekannt';
  if (!v) return n;
  if (!n) return v;
  return `${v}_${n}`;
}
