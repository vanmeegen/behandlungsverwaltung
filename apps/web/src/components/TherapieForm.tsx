import { observer } from 'mobx-react-lite';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import {
  THERAPIE_FORM_VALUES,
  type TherapieFieldErrors,
  type TherapieFormValue,
  type TherapieStore,
} from '../models/TherapieStore';

interface TherapieFormProps {
  therapieStore: TherapieStore;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  redirectOnSuccess?: string;
}

const FORM_LABEL: Record<TherapieFormValue, string> = {
  dyskalkulie: 'Dyskalkulietherapie',
  lerntherapie: 'Lerntherapie',
  heilpaedagogik: 'Heilpädagogik',
  elternberatung: 'Elternberatung',
  sonstiges: 'Sonstiges',
};

function FieldError({
  field,
  errors,
}: {
  field: keyof TherapieFieldErrors;
  errors: TherapieFieldErrors;
}): JSX.Element | null {
  const message = errors[field];
  if (!message) return null;
  return (
    <span role="alert" data-testselector={`therapie-form-${field}-error`}>
      {message}
    </span>
  );
}

function auftraggeberLabel(ag: {
  typ: 'firma' | 'person';
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
}): string {
  if (ag.typ === 'firma') return ag.firmenname ?? '';
  return `${ag.nachname ?? ''}, ${ag.vorname ?? ''}`;
}

export const TherapieForm = observer(
  ({
    therapieStore,
    kindStore,
    auftraggeberStore,
    redirectOnSuccess = '/therapien',
  }: TherapieFormProps) => {
    const navigate = useNavigate();
    const { draftTherapie: draft } = therapieStore;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await therapieStore.saveDraft();
      if (saved) {
        draft.reset();
        navigate(redirectOnSuccess);
      }
    };

    const onFormChange = (event: ChangeEvent<HTMLSelectElement>): void => {
      draft.setForm(event.target.value as TherapieFormValue);
    };

    return (
      <form onSubmit={onSubmit} data-testselector="therapie-form">
        <label>
          Kind
          <select
            data-testselector="therapie-form-kindId"
            value={draft.kindId}
            onChange={(e): void => draft.setKindId(e.target.value)}
          >
            <option value="">– bitte wählen –</option>
            {kindStore.items.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nachname}, {k.vorname}
              </option>
            ))}
          </select>
          <FieldError field="kindId" errors={draft.errors} />
        </label>

        <label>
          Auftraggeber
          <select
            data-testselector="therapie-form-auftraggeberId"
            value={draft.auftraggeberId}
            onChange={(e): void => draft.setAuftraggeberId(e.target.value)}
          >
            <option value="">– bitte wählen –</option>
            {auftraggeberStore.items.map((a) => (
              <option key={a.id} value={a.id}>
                {auftraggeberLabel(a)}
              </option>
            ))}
          </select>
          <FieldError field="auftraggeberId" errors={draft.errors} />
        </label>

        <label>
          Therapieform
          <select data-testselector="therapie-form-form" value={draft.form} onChange={onFormChange}>
            {THERAPIE_FORM_VALUES.map((f) => (
              <option key={f} value={f}>
                {FORM_LABEL[f]}
              </option>
            ))}
          </select>
          <FieldError field="form" errors={draft.errors} />
        </label>

        {draft.form === 'sonstiges' && (
          <label>
            Kommentar
            <input
              data-testselector="therapie-form-kommentar"
              value={draft.kommentar}
              onChange={(e): void => draft.setKommentar(e.target.value)}
            />
            <FieldError field="kommentar" errors={draft.errors} />
          </label>
        )}

        <label>
          Bewilligte Behandlungseinheiten
          <input
            type="number"
            min={1}
            inputMode="numeric"
            data-testselector="therapie-form-bewilligteBe"
            value={draft.bewilligteBe === 0 ? '' : draft.bewilligteBe}
            onChange={(e): void => {
              const raw = e.target.value;
              draft.setBewilligteBe(raw === '' ? 0 : Number.parseInt(raw, 10));
            }}
          />
          <FieldError field="bewilligteBe" errors={draft.errors} />
        </label>

        <label>
          Arbeitsthema (optional)
          <input
            data-testselector="therapie-form-arbeitsthema"
            value={draft.arbeitsthema}
            onChange={(e): void => draft.setArbeitsthema(e.target.value)}
          />
          <FieldError field="arbeitsthema" errors={draft.errors} />
        </label>

        <button type="submit" data-testselector="therapie-form-submit">
          Speichern
        </button>

        {therapieStore.error && (
          <p role="alert" data-testselector="therapie-form-server-error">
            {therapieStore.error}
          </p>
        )}
      </form>
    );
  },
);
