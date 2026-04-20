import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TherapieList } from '../components/TherapieList';
import type { TherapieStore } from '../models/TherapieStore';

interface TherapieListPageProps {
  store: TherapieStore;
}

export const TherapieListPage = observer(({ store }: TherapieListPageProps) => {
  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.loading && store.items.length === 0) {
    return <p role="status">Lade Therapien…</p>;
  }

  return (
    <section data-testselector="therapie-list-page">
      <header>
        <h1>Therapien</h1>
        <Link to="/therapien/new" data-testselector="therapie-list-new">
          Neu
        </Link>
      </header>
      <TherapieList items={store.items} />
    </section>
  );
});
