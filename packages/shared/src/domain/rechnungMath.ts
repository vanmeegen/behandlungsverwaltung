export interface RechnungsLineInput {
  be: number;
}

export interface RechnungsLine {
  be: number;
  zeilenbetragCents: number;
}

export function computeRechnungsLines(
  input: readonly RechnungsLineInput[],
  stundensatzCents: number,
): RechnungsLine[] {
  if (!Number.isInteger(stundensatzCents) || stundensatzCents <= 0) {
    throw new Error(`Stundensatz muss > 0 sein, war: ${stundensatzCents}`);
  }
  return input.map((row) => {
    if (!Number.isInteger(row.be) || row.be <= 0) {
      throw new Error(`BE muss ≥ 1 sein, war: ${row.be}`);
    }
    return {
      be: row.be,
      zeilenbetragCents: row.be * stundensatzCents,
    };
  });
}

export function sumZeilenbetraege(lines: readonly RechnungsLine[]): number {
  let sum = 0;
  for (const line of lines) sum += line.zeilenbetragCents;
  return sum;
}
