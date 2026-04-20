import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { AuftraggeberList } from '../components/AuftraggeberList';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';

interface AuftraggeberListPageProps {
  store: AuftraggeberStore;
}

export const AuftraggeberListPage = observer(({ store }: AuftraggeberListPageProps) => {
  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.loading && store.items.length === 0) {
    return <p role="status">Lade Auftraggeber…</p>;
  }

  return <AuftraggeberList store={store} />;
});
