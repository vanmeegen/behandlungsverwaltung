import { z } from 'zod';
import { THERAPIE_FORM_VALUES } from './therapieFormValues';

export const TAETIGKEIT_VALUES = [
  ...THERAPIE_FORM_VALUES,
  'elterngespraech',
  'lehrergespraech',
  'bericht',
  'foerderplan',
  'teamberatung',
] as const;

export type TaetigkeitValue = (typeof TAETIGKEIT_VALUES)[number];

export const taetigkeitSchema = z.enum(TAETIGKEIT_VALUES, {
  error: 'Tätigkeit ist ungültig',
});
