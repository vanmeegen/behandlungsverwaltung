import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { KindForm } from '../components/KindForm';
import type { KindStore } from '../models/KindStore';

interface KindFormPageProps {
  store: KindStore;
}

export const KindFormPage = observer(({ store }: KindFormPageProps) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) {
      store.startCreate();
      return;
    }
    const existing = store.items.find((k) => k.id === id);
    if (existing) {
      store.startEdit(existing);
      return;
    }
    void store.load().then(() => {
      const loaded = store.items.find((k) => k.id === id);
      if (loaded) store.startEdit(loaded);
    });
  }, [id, store]);

  return (
    <section>
      <h1>{id ? 'Kind bearbeiten' : 'Neues Kind'}</h1>
      <KindForm store={store} />
    </section>
  );
});
