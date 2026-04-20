import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { KindList } from '../components/KindList';
import type { KindStore } from '../models/KindStore';

interface KindListPageProps {
  store: KindStore;
}

export const KindListPage = observer(({ store }: KindListPageProps) => {
  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.loading && store.items.length === 0) {
    return <p role="status">Lade Kinder…</p>;
  }

  return <KindList store={store} />;
});
