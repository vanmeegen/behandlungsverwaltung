import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TherapieForm } from '../components/TherapieForm';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { TherapieStore } from '../models/TherapieStore';

interface TherapieFormPageProps {
  therapieStore: TherapieStore;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
}

export const TherapieFormPage = observer(
  ({ therapieStore, kindStore, auftraggeberStore }: TherapieFormPageProps) => {
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
      if (!id) {
        therapieStore.startCreate();
        return;
      }
      const existing = therapieStore.items.find((t) => t.id === id);
      if (existing) {
        therapieStore.startEdit(existing);
        return;
      }
      void therapieStore.load().then(() => {
        const loaded = therapieStore.items.find((t) => t.id === id);
        if (loaded) therapieStore.startEdit(loaded);
      });
    }, [id, therapieStore, kindStore, auftraggeberStore]);

    return (
      <section>
        <h1>{id ? 'Therapie bearbeiten' : 'Neue Therapie'}</h1>
        <TherapieForm
          therapieStore={therapieStore}
          kindStore={kindStore}
          auftraggeberStore={auftraggeberStore}
        />
      </section>
    );
  },
);
