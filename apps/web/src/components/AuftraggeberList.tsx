import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import type { Auftraggeber, AuftraggeberStore } from '../models/AuftraggeberStore';

interface AuftraggeberListProps {
  store: AuftraggeberStore;
}

function displayName(ag: Auftraggeber): JSX.Element {
  if (ag.typ === 'firma') {
    return <span data-testselector={`auftraggeber-row-firmenname-${ag.id}`}>{ag.firmenname}</span>;
  }
  return (
    <>
      <span data-testselector={`auftraggeber-row-nachname-${ag.id}`}>{ag.nachname}</span>
      {', '}
      <span data-testselector={`auftraggeber-row-vorname-${ag.id}`}>{ag.vorname}</span>
    </>
  );
}

export const AuftraggeberList = observer(({ store }: AuftraggeberListProps) => {
  return (
    <section data-testselector="auftraggeber-list">
      <header>
        <h1>Auftraggeber</h1>
        <Link to="/auftraggeber/new" data-testselector="auftraggeber-list-new">
          Neu
        </Link>
      </header>
      {store.items.length === 0 ? (
        <p data-testselector="auftraggeber-list-empty">Noch keine Auftraggeber erfasst.</p>
      ) : (
        <ul>
          {store.items.map((ag) => (
            <li key={ag.id} data-testselector="auftraggeber-row">
              {displayName(ag)}
              <Link
                to={`/auftraggeber/${ag.id}`}
                data-testselector={`auftraggeber-row-edit-${ag.id}`}
              >
                Bearbeiten
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
