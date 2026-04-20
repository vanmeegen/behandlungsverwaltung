const EURO_PATTERN = /^(\d+)(?:[.,](\d{2}))?$/;

export function parseEuroToCents(input: string): number | null {
  const trimmed = input.trim();
  const match = EURO_PATTERN.exec(trimmed);
  if (!match) return null;
  const euros = Number.parseInt(match[1] ?? '0', 10);
  const cents = match[2] ? Number.parseInt(match[2], 10) : 0;
  if (!Number.isFinite(euros) || !Number.isFinite(cents)) return null;
  return euros * 100 + cents;
}
