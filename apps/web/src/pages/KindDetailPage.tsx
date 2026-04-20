import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TherapieList } from '../components/TherapieList';
import type { KindStore } from '../models/KindStore';
import type { TherapieStore } from '../models/TherapieStore';

interface KindDetailPageProps {
  kindStore: KindStore;
  therapieStore: TherapieStore;
}

export const KindDetailPage = observer(({ kindStore, therapieStore }: KindDetailPageProps) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;
    void kindStore.load();
    void therapieStore.loadByKind(id);
  }, [id, kindStore, therapieStore]);

  const kind = id ? kindStore.items.find((k) => k.id === id) : undefined;
  const therapien = id ? (therapieStore.byKind[id] ?? []) : [];

  return (
    <section data-testselector="kind-detail-page">
      <h1>
        {kind ? (
          <>
            <span data-testselector="kind-detail-nachname">{kind.nachname}</span>
            {', '}
            <span data-testselector="kind-detail-vorname">{kind.vorname}</span>
          </>
        ) : (
          'Kind'
        )}
      </h1>
      <section>
        <h2>Therapien</h2>
        <TherapieList items={therapien} />
      </section>
    </section>
  );
});
