import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TherapieList } from '../components/TherapieList';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { TherapieStore } from '../models/TherapieStore';

interface AuftraggeberDetailPageProps {
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
}

export const AuftraggeberDetailPage = observer(
  ({ auftraggeberStore, therapieStore }: AuftraggeberDetailPageProps) => {
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
      if (!id) return;
      void auftraggeberStore.load();
      void therapieStore.loadByAuftraggeber(id);
    }, [id, auftraggeberStore, therapieStore]);

    const ag = id ? auftraggeberStore.items.find((a) => a.id === id) : undefined;
    const therapien = id ? (therapieStore.byAuftraggeber[id] ?? []) : [];

    return (
      <section data-testselector="auftraggeber-detail-page">
        <h1>
          {ag?.typ === 'firma' && (
            <span data-testselector="auftraggeber-detail-firmenname">{ag.firmenname}</span>
          )}
          {ag?.typ === 'person' && (
            <>
              <span data-testselector="auftraggeber-detail-nachname">{ag.nachname}</span>
              {', '}
              <span data-testselector="auftraggeber-detail-vorname">{ag.vorname}</span>
            </>
          )}
          {!ag && 'Auftraggeber'}
        </h1>
        <section>
          <h2>Therapien</h2>
          <TherapieList items={therapien} />
        </section>
      </section>
    );
  },
);
