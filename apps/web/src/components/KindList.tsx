import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import type { KindStore } from '../models/KindStore';

interface KindListProps {
  store: KindStore;
}

export const KindList = observer(({ store }: KindListProps) => {
  return (
    <section data-testselector="kind-list">
      <header>
        <h1>Kinder</h1>
        <Link to="/kinder/new" data-testselector="kind-list-new">
          Neu
        </Link>
      </header>
      {store.items.length === 0 ? (
        <p data-testselector="kind-list-empty">Noch keine Kinder erfasst.</p>
      ) : (
        <ul>
          {store.items.map((kind) => (
            <li key={kind.id} data-testselector="kind-row">
              <span data-testselector={`kind-row-nachname-${kind.id}`}>{kind.nachname}</span>
              {', '}
              <span data-testselector={`kind-row-vorname-${kind.id}`}>{kind.vorname}</span>
              <Link to={`/kinder/${kind.id}`} data-testselector={`kind-row-edit-${kind.id}`}>
                Bearbeiten
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
