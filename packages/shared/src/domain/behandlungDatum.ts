export class BehandlungVorStartdatumError extends Error {
  constructor() {
    super('Datum liegt vor dem Startdatum der Therapie');
    this.name = 'BehandlungVorStartdatumError';
  }
}

export function assertDatumGeStartdatum(behandlungsDatum: Date, therapieStartdatum: Date): void {
  const b = behandlungsDatum.getTime();
  const s = therapieStartdatum.getTime();
  if (b < s) {
    throw new BehandlungVorStartdatumError();
  }
}
