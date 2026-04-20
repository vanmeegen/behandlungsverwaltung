import { observer } from 'mobx-react-lite';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KindFieldErrors, KindStore } from '../models/KindStore';

interface KindFormProps {
  store: KindStore;
  redirectOnSuccess?: string;
}

function FieldError({
  field,
  errors,
}: {
  field: keyof KindFieldErrors;
  errors: KindFieldErrors;
}): JSX.Element | null {
  const message = errors[field];
  if (!message) return null;
  return (
    <span role="alert" data-testselector={`kind-form-${field}-error`}>
      {message}
    </span>
  );
}

export const KindForm = observer(({ store, redirectOnSuccess = '/kinder' }: KindFormProps) => {
  const navigate = useNavigate();
  const { draftKind } = store;

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const saved = await store.saveDraft();
    if (saved) {
      draftKind.reset();
      navigate(redirectOnSuccess);
    }
  };

  const makeHandler =
    (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setter(event.target.value);
    };

  return (
    <form onSubmit={onSubmit} data-testselector="kind-form">
      <label>
        Vorname
        <input
          data-testselector="kind-form-vorname"
          value={draftKind.vorname}
          onChange={makeHandler(draftKind.setVorname)}
        />
        <FieldError field="vorname" errors={draftKind.errors} />
      </label>

      <label>
        Nachname
        <input
          data-testselector="kind-form-nachname"
          value={draftKind.nachname}
          onChange={makeHandler(draftKind.setNachname)}
        />
        <FieldError field="nachname" errors={draftKind.errors} />
      </label>

      <label>
        Geburtsdatum
        <input
          type="date"
          data-testselector="kind-form-geburtsdatum"
          value={draftKind.geburtsdatum}
          onChange={makeHandler(draftKind.setGeburtsdatum)}
        />
        <FieldError field="geburtsdatum" errors={draftKind.errors} />
      </label>

      <label>
        Straße
        <input
          data-testselector="kind-form-strasse"
          value={draftKind.strasse}
          onChange={makeHandler(draftKind.setStrasse)}
        />
        <FieldError field="strasse" errors={draftKind.errors} />
      </label>

      <label>
        Hausnummer
        <input
          data-testselector="kind-form-hausnummer"
          value={draftKind.hausnummer}
          onChange={makeHandler(draftKind.setHausnummer)}
        />
        <FieldError field="hausnummer" errors={draftKind.errors} />
      </label>

      <label>
        PLZ
        <input
          data-testselector="kind-form-plz"
          value={draftKind.plz}
          onChange={makeHandler(draftKind.setPlz)}
        />
        <FieldError field="plz" errors={draftKind.errors} />
      </label>

      <label>
        Stadt
        <input
          data-testselector="kind-form-stadt"
          value={draftKind.stadt}
          onChange={makeHandler(draftKind.setStadt)}
        />
        <FieldError field="stadt" errors={draftKind.errors} />
      </label>

      <label>
        Aktenzeichen
        <input
          data-testselector="kind-form-aktenzeichen"
          value={draftKind.aktenzeichen}
          onChange={makeHandler(draftKind.setAktenzeichen)}
        />
        <FieldError field="aktenzeichen" errors={draftKind.errors} />
      </label>

      <button type="submit" data-testselector="kind-form-submit">
        Speichern
      </button>

      {store.error && (
        <p role="alert" data-testselector="kind-form-server-error">
          {store.error}
        </p>
      )}
    </form>
  );
});
