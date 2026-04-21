export const THERAPIE_FORM_VALUES = [
  'dyskalkulie',
  'lerntherapie',
  'lrs_therapie',
  'resilienztraining',
  'heilpaedagogik',
  'elternberatung',
  'sonstiges',
] as const;

export type TherapieFormValue = (typeof THERAPIE_FORM_VALUES)[number];
