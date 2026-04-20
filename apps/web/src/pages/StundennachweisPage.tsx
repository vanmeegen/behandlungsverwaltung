import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { StundennachweisStore } from '../models/StundennachweisStore';

interface StundennachweisPageProps {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  stundennachweisStore: StundennachweisStore;
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

export const StundennachweisPage = observer(
  ({ kindStore, auftraggeberStore, stundennachweisStore }: StundennachweisPageProps) => {
    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
    }, [kindStore, auftraggeberStore]);

    const draft = stundennachweisStore.draftStundennachweis;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      await stundennachweisStore.saveDraft();
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
      <section data-testselector="stundennachweis-page">
        <h1>Stundennachweis drucken</h1>
        <form onSubmit={onSubmit}>
          <label>
            Abrechnungsmonat
            <input
              type="month"
              data-testselector="stundennachweis-monat"
              value={monthValue}
              onChange={onMonthChange}
            />
          </label>
          <label>
            Kind
            <select
              data-testselector="stundennachweis-kindId"
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
              data-testselector="stundennachweis-auftraggeberId"
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
          <button type="submit" data-testselector="stundennachweis-submit">
            Stundennachweis drucken
          </button>
        </form>

        {stundennachweisStore.lastCreated && (
          <p role="status" data-testselector="stundennachweis-success">
            Stundennachweis erstellt: {stundennachweisStore.lastCreated.dateiname}
          </p>
        )}

        {stundennachweisStore.error && (
          <p role="alert" data-testselector="stundennachweis-error">
            {stundennachweisStore.error.message}
          </p>
        )}
      </section>
    );
  },
);
