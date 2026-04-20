import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AuftraggeberForm } from '../components/AuftraggeberForm';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';

interface AuftraggeberFormPageProps {
  store: AuftraggeberStore;
}

export const AuftraggeberFormPage = observer(({ store }: AuftraggeberFormPageProps) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) {
      store.startCreate();
      return;
    }
    const existing = store.items.find((a) => a.id === id);
    if (existing) {
      store.startEdit(existing);
      return;
    }
    void store.load().then(() => {
      const loaded = store.items.find((a) => a.id === id);
      if (loaded) store.startEdit(loaded);
    });
  }, [id, store]);

  return (
    <section>
      <h1>{id ? 'Auftraggeber bearbeiten' : 'Neuer Auftraggeber'}</h1>
      <AuftraggeberForm store={store} />
    </section>
  );
});
