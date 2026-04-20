const DE_EURO = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEuro(amountCents: number): string {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`formatEuro requires integer cents, got: ${amountCents}`);
  }
  return DE_EURO.format(amountCents / 100);
}
