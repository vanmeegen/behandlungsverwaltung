import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BeStepper } from '../components/BeStepper';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { BehandlungStore } from '../models/BehandlungStore';
import type { KindStore } from '../models/KindStore';
import type { TherapieStore } from '../models/TherapieStore';

interface SchnellerfassungPageProps {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
  behandlungStore: BehandlungStore;
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

export const SchnellerfassungPage = observer(
  ({ kindStore, auftraggeberStore, therapieStore, behandlungStore }: SchnellerfassungPageProps) => {
    const navigate = useNavigate();
    const { draftBehandlung: draft } = behandlungStore;

    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
      void therapieStore.load();
    }, [kindStore, auftraggeberStore, therapieStore]);

    const therapienForKind = draft.kindId
      ? therapieStore.items.filter((t) => t.kindId === draft.kindId)
      : [];

    const onTherapieChange = (id: string): void => {
      const t = therapieStore.items.find((tx) => tx.id === id);
      draft.setTherapie(id, t?.arbeitsthema ?? null);
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await behandlungStore.saveDraft();
      if (saved) {
        draft.reset();
        navigate('/');
      }
    };

    return (
      <section data-testselector="schnellerfassung-page">
        <h1>Behandlung erfassen</h1>
        <form onSubmit={onSubmit}>
          <label>
            Kind
            <select
              data-testselector="schnellerfassung-kindId"
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
            Therapie
            <select
              data-testselector="schnellerfassung-therapieId"
              value={draft.therapieId}
              onChange={(e): void => onTherapieChange(e.target.value)}
              disabled={!draft.kindId}
            >
              <option value="">– bitte wählen –</option>
              {therapienForKind.map((t) => {
                const ag = auftraggeberStore.items.find((a) => a.id === t.auftraggeberId);
                const label = `${t.form}${ag ? ` · ${auftraggeberLabel(ag)}` : ''}`;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            {draft.errors.therapieId && (
              <span role="alert" data-testselector="schnellerfassung-therapieId-error">
                {draft.errors.therapieId}
              </span>
            )}
          </label>

          <div>
            <span>Behandlungseinheiten</span>
            <BeStepper
              value={draft.be}
              onIncrement={draft.incrementBe}
              onDecrement={draft.decrementBe}
              testPrefix="schnellerfassung-be"
            />
          </div>

          <label>
            Datum
            <input
              type="date"
              data-testselector="schnellerfassung-datum"
              value={draft.datum}
              onChange={(e): void => draft.setDatum(e.target.value)}
            />
            {draft.errors.datum && (
              <span role="alert" data-testselector="schnellerfassung-datum-error">
                {draft.errors.datum}
              </span>
            )}
          </label>

          <label>
            Arbeitsthema
            <input
              data-testselector="schnellerfassung-arbeitsthema"
              value={draft.arbeitsthema}
              onChange={(e): void => draft.setArbeitsthema(e.target.value)}
            />
          </label>

          <button type="submit" data-testselector="schnellerfassung-submit">
            Speichern
          </button>

          {behandlungStore.error && (
            <p role="alert" data-testselector="schnellerfassung-server-error">
              {behandlungStore.error}
            </p>
          )}
        </form>
      </section>
    );
  },
);
