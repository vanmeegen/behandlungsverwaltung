import { AUFTRAGGEBER_TYP, TEMPLATE_KIND, THERAPIE_FORM } from '../../db/schema';
import { builder } from '../builder';

export const AuftraggeberTypEnum = builder.enumType('AuftraggeberTyp', {
  values: AUFTRAGGEBER_TYP,
});

export const TherapieFormEnum = builder.enumType('TherapieForm', {
  values: THERAPIE_FORM,
});

export const TemplateKindEnum = builder.enumType('TemplateKind', {
  values: TEMPLATE_KIND,
});
