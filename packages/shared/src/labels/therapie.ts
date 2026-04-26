import type { TherapieFormValue } from '../validation/therapie';
import type { TaetigkeitValue } from '../validation/taetigkeit';

export const THERAPIE_FORM_LABELS: Record<TherapieFormValue, string> = {
  dyskalkulie: 'Dyskalkulie-Therapie',
  lerntherapie: 'Lern-Therapie',
  lrs_therapie: 'Legasthenie-Therapie',
  resilienztraining: 'Resilienztraining',
  heilpaedagogik: 'Heilpädagogik',
  elternberatung: 'Elternberatung',
  sonstiges: 'Sonstiges',
};

export const TAETIGKEIT_LABELS: Record<TaetigkeitValue, string> = {
  ...THERAPIE_FORM_LABELS,
  elterngespraech: 'Elterngespräch',
  lehrergespraech: 'Lehrergespräch',
  bericht: 'Bericht',
  foerderplan: 'Förderplan',
  teamberatung: 'Teamberatung',
};

export function therapieFormLabel(value: TherapieFormValue): string {
  return THERAPIE_FORM_LABELS[value];
}

export function taetigkeitLabel(value: TaetigkeitValue): string {
  return TAETIGKEIT_LABELS[value];
}
