import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { AuftraggeberList } from '../../components/AuftraggeberList';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';

const firma: Auftraggeber = {
  id: '1',
  typ: 'firma',
  firmenname: 'Jugendamt Köln',
  vorname: null,
  nachname: null,
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
  abteilung: null,
  rechnungskopfText: 'Mein Honorar …:',
};

const person: Auftraggeber = {
  id: '2',
  typ: 'person',
  firmenname: null,
  vorname: 'Petra',
  nachname: 'Privatzahlerin',
  strasse: 'Lindenallee',
  hausnummer: '7',
  plz: '50667',
  stadt: 'Köln',
  stundensatzCents: 6000,
  abteilung: null,
  rechnungskopfText: 'Mein Honorar …:',
};

function renderList(store: AuftraggeberStore): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AuftraggeberList store={store} />
    </MemoryRouter>,
  );
}

describe('<AuftraggeberList />', () => {
  it('renders an empty-state message on an empty list', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    renderList(store);
    expect(screen.getByTestId('auftraggeber-list-empty')).toBeInTheDocument();
  });

  it('renders a row per Auftraggeber with firmenname for Firma', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.items = [firma];
    renderList(store);
    expect(screen.getByTestId('auftraggeber-row')).toBeInTheDocument();
    expect(screen.getByTestId(`auftraggeber-row-firmenname-${firma.id}`)).toHaveTextContent(
      'Jugendamt Köln',
    );
  });

  it('renders a row per Auftraggeber with nachname, vorname for Person', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.items = [person];
    renderList(store);
    expect(screen.getByTestId(`auftraggeber-row-nachname-${person.id}`)).toHaveTextContent(
      'Privatzahlerin',
    );
    expect(screen.getByTestId(`auftraggeber-row-vorname-${person.id}`)).toHaveTextContent('Petra');
  });

  it('links each row to its edit page', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.items = [firma];
    renderList(store);
    const edit = screen.getByTestId(`auftraggeber-row-edit-${firma.id}`);
    expect(edit).toHaveAttribute('href', `/auftraggeber/${firma.id}`);
  });

  it('renders a "Neu" action linking to the new form', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    renderList(store);
    const neu = screen.getByTestId('auftraggeber-list-new');
    expect(neu).toHaveAttribute('href', '/auftraggeber/new');
  });
});
