import { observer } from 'mobx-react-lite';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuftraggeberFieldErrors, AuftraggeberStore } from '../models/AuftraggeberStore';

interface AuftraggeberFormProps {
  store: AuftraggeberStore;
  redirectOnSuccess?: string;
}

function FieldError({
  field,
  errors,
}: {
  field: keyof AuftraggeberFieldErrors;
  errors: AuftraggeberFieldErrors;
}): JSX.Element | null {
  const message = errors[field];
  if (!message) return null;
  return (
    <span role="alert" data-testselector={`auftraggeber-form-${field}-error`}>
      {message}
    </span>
  );
}

export const AuftraggeberForm = observer(
  ({ store, redirectOnSuccess = '/auftraggeber' }: AuftraggeberFormProps) => {
    const navigate = useNavigate();
    const { draftAuftraggeber: draft } = store;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await store.saveDraft();
      if (saved) {
        draft.reset();
        navigate(redirectOnSuccess);
      }
    };

    const makeHandler =
      (setter: (value: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        setter(event.target.value);
      };

    return (
      <form onSubmit={onSubmit} data-testselector="auftraggeber-form">
        <fieldset>
          <legend>Typ</legend>
          <label>
            <input
              type="radio"
              name="typ"
              value="firma"
              data-testselector="auftraggeber-form-typ-firma"
              checked={draft.typ === 'firma'}
              onChange={(): void => draft.setTyp('firma')}
            />
            Firma
          </label>
          <label>
            <input
              type="radio"
              name="typ"
              value="person"
              data-testselector="auftraggeber-form-typ-person"
              checked={draft.typ === 'person'}
              onChange={(): void => draft.setTyp('person')}
            />
            Person
          </label>
        </fieldset>

        {draft.typ === 'firma' && (
          <label>
            Firmenname
            <input
              data-testselector="auftraggeber-form-firmenname"
              value={draft.firmenname}
              onChange={makeHandler(draft.setFirmenname)}
            />
            <FieldError field="firmenname" errors={draft.errors} />
          </label>
        )}

        {draft.typ === 'person' && (
          <>
            <label>
              Vorname
              <input
                data-testselector="auftraggeber-form-vorname"
                value={draft.vorname}
                onChange={makeHandler(draft.setVorname)}
              />
              <FieldError field="vorname" errors={draft.errors} />
            </label>

            <label>
              Nachname
              <input
                data-testselector="auftraggeber-form-nachname"
                value={draft.nachname}
                onChange={makeHandler(draft.setNachname)}
              />
              <FieldError field="nachname" errors={draft.errors} />
            </label>
          </>
        )}

        <label>
          Straße
          <input
            data-testselector="auftraggeber-form-strasse"
            value={draft.strasse}
            onChange={makeHandler(draft.setStrasse)}
          />
          <FieldError field="strasse" errors={draft.errors} />
        </label>

        <label>
          Hausnummer
          <input
            data-testselector="auftraggeber-form-hausnummer"
            value={draft.hausnummer}
            onChange={makeHandler(draft.setHausnummer)}
          />
          <FieldError field="hausnummer" errors={draft.errors} />
        </label>

        <label>
          PLZ
          <input
            data-testselector="auftraggeber-form-plz"
            value={draft.plz}
            onChange={makeHandler(draft.setPlz)}
          />
          <FieldError field="plz" errors={draft.errors} />
        </label>

        <label>
          Stadt
          <input
            data-testselector="auftraggeber-form-stadt"
            value={draft.stadt}
            onChange={makeHandler(draft.setStadt)}
          />
          <FieldError field="stadt" errors={draft.errors} />
        </label>

        <label>
          Stundensatz (€)
          <input
            inputMode="decimal"
            data-testselector="auftraggeber-form-stundensatz"
            value={draft.stundensatz}
            onChange={makeHandler(draft.setStundensatz)}
          />
          <FieldError field="stundensatzCents" errors={draft.errors} />
        </label>

        <button type="submit" data-testselector="auftraggeber-form-submit">
          Speichern
        </button>

        {store.error && (
          <p role="alert" data-testselector="auftraggeber-form-server-error">
            {store.error}
          </p>
        )}
      </form>
    );
  },
);
