import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { RechnungStore } from '../models/RechnungStore';

interface RechnungCreatePageProps {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  rechnungStore: RechnungStore;
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

export const RechnungCreatePage = observer(
  ({ kindStore, auftraggeberStore, rechnungStore }: RechnungCreatePageProps) => {
    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
    }, [kindStore, auftraggeberStore]);

    const { draftRechnung: draft } = rechnungStore;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      await rechnungStore.saveDraft();
    };

    const onMonthChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const raw = event.target.value;
      if (!/^\d{4}-\d{2}$/.test(raw)) return;
      const [y, m] = raw.split('-') as [string, string];
      draft.setYear(Number.parseInt(y, 10));
      draft.setMonth(Number.parseInt(m, 10));
    };

    const monthValue = `${draft.year}-${String(draft.month).padStart(2, '0')}`;

    return (
      <section data-testselector="rechnung-create-page">
        <h1>Rechnung erstellen</h1>
        <form onSubmit={onSubmit}>
          <label>
            Abrechnungsmonat
            <input
              type="month"
              data-testselector="rechnung-create-monat"
              value={monthValue}
              onChange={onMonthChange}
            />
          </label>

          <label>
            Kind
            <select
              data-testselector="rechnung-create-kindId"
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
          </label>

          <label>
            Auftraggeber
            <select
              data-testselector="rechnung-create-auftraggeberId"
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
          </label>

          <button type="submit" data-testselector="rechnung-create-submit">
            Rechnung erzeugen
          </button>
        </form>

        {rechnungStore.lastCreated && (
          <p
            role="status"
            data-testselector="rechnung-create-success"
          >{`Rechnung erstellt: ${rechnungStore.lastCreated.nummer}`}</p>
        )}

        {rechnungStore.error?.code === 'DUPLICATE_RECHNUNG' && (
          <div role="alertdialog" data-testselector="duplicate-confirm">
            <p>{rechnungStore.error.message}</p>
            <button
              type="button"
              data-testselector="duplicate-confirm-dismiss"
              onClick={(): void => rechnungStore.dismissError()}
            >
              OK
            </button>
          </div>
        )}

        {rechnungStore.error?.code === 'KEINE_BEHANDLUNGEN' && (
          <p role="alert" data-testselector="keine-behandlungen">
            {rechnungStore.error.message}
          </p>
        )}

        {rechnungStore.error &&
          rechnungStore.error.code !== 'DUPLICATE_RECHNUNG' &&
          rechnungStore.error.code !== 'KEINE_BEHANDLUNGEN' && (
            <p role="alert" data-testselector="rechnung-create-error">
              {rechnungStore.error.message}
            </p>
          )}
      </section>
    );
  },
);
