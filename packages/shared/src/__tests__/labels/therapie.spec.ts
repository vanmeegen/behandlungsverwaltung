import { describe, expect, it } from 'bun:test';
import { TAETIGKEIT_LABELS, THERAPIE_FORM_LABELS } from '../../labels/therapie';

describe('THERAPIE_FORM_LABELS (AC-TH-03)', () => {
  it('dyskalkulie → Dyskalkulie-Therapie', () => {
    expect(THERAPIE_FORM_LABELS.dyskalkulie).toBe('Dyskalkulie-Therapie');
  });

  it('lerntherapie → Lern-Therapie', () => {
    expect(THERAPIE_FORM_LABELS.lerntherapie).toBe('Lern-Therapie');
  });

  it('lrs_therapie → Legasthenie-Therapie', () => {
    expect(THERAPIE_FORM_LABELS.lrs_therapie).toBe('Legasthenie-Therapie');
  });
});

describe('TAETIGKEIT_LABELS includes renamed therapy labels (AC-BEH-04)', () => {
  it('dyskalkulie → Dyskalkulie-Therapie', () => {
    expect(TAETIGKEIT_LABELS.dyskalkulie).toBe('Dyskalkulie-Therapie');
  });

  it('lerntherapie → Lern-Therapie', () => {
    expect(TAETIGKEIT_LABELS.lerntherapie).toBe('Lern-Therapie');
  });

  it('lrs_therapie → Legasthenie-Therapie', () => {
    expect(TAETIGKEIT_LABELS.lrs_therapie).toBe('Legasthenie-Therapie');
  });
});
