import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { KindList } from '../../components/KindList';
import { KindStore, type Kind } from '../../models/KindStore';

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter initialEntries={['/kinder']}>{ui}</MemoryRouter>);
}

const kindAnna: Kind = {
  id: '1',
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: '2018-03-14',
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

const kindBen: Kind = {
  id: '2',
  vorname: 'Ben',
  nachname: 'Zimmermann',
  geburtsdatum: '2019-05-10',
  strasse: 'Lindenallee',
  hausnummer: '7',
  plz: '51103',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-002',
};

describe('<KindList />', () => {
  it('renders one row per Kind with the kind-row data-testselector', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    store.items = [kindAnna, kindBen];
    renderWithRouter(<KindList store={store} />);
    expect(screen.getAllByTestId('kind-row')).toHaveLength(2);
  });

  it('renders a per-Kind nachname cell addressable by id', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    store.items = [kindAnna];
    renderWithRouter(<KindList store={store} />);
    expect(screen.getByTestId('kind-row-nachname-1')).toHaveTextContent('Musterfrau');
  });

  it('exposes an empty state when no Kinder are loaded', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    renderWithRouter(<KindList store={store} />);
    expect(screen.getByTestId('kind-list-empty')).toBeInTheDocument();
  });

  it('links each row to its edit page via data-testselector="kind-row-edit-<id>"', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    store.items = [kindAnna];
    renderWithRouter(<KindList store={store} />);
    const link = screen.getByTestId('kind-row-edit-1');
    expect(link).toHaveAttribute('href', '/kinder/1');
  });

  it('renders a "Neu" action linking to the new-Kind form', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    renderWithRouter(<KindList store={store} />);
    const neu = screen.getByTestId('kind-list-new');
    expect(neu).toHaveAttribute('href', '/kinder/new');
  });
});
