import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';
import { KindStore, type Kind } from '../../models/KindStore';
import { RechnungStore, type Rechnung } from '../../models/RechnungStore';
import { RechnungListPage } from '../../pages/RechnungListPage';

const anna: Kind = {
  id: '10',
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: '2018-03-14',
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

const ben: Kind = {
  id: '11',
  vorname: 'Ben',
  nachname: 'Beispiel',
  geburtsdatum: '2019-05-10',
  strasse: 'Lindenallee',
  hausnummer: '7',
  plz: '51103',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-002',
};

const jugendamt: Auftraggeber = {
  id: '20',
  typ: 'firma',
  firmenname: 'Jugendamt Köln',
  vorname: null,
  nachname: null,
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
};

const r1: Rechnung = {
  id: '1',
  nummer: '2026-04-0001',
  jahr: 2026,
  monat: 4,
  kindId: '10',
  auftraggeberId: '20',
  stundensatzCentsSnapshot: 4500,
  gesamtCents: 27000,
  dateiname: '2026-04-0001-Anna_Musterfrau.pdf',
};

const r2: Rechnung = {
  id: '2',
  nummer: '2026-04-0002',
  jahr: 2026,
  monat: 4,
  kindId: '11',
  auftraggeberId: '20',
  stundensatzCentsSnapshot: 4500,
  gesamtCents: 9000,
  dateiname: '2026-04-0002-Ben_Beispiel.pdf',
};

// Intl may insert NBSP between amount and €.
function normalize(s: string): string {
  return s.replace(/\u00A0/g, ' ');
}

function renderPage(fetcher: GraphQLFetcher): {
  rechnungStore: RechnungStore;
} {
  const rechnungStore = new RechnungStore(fetcher);
  const kindStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
  const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
  kindStore.items = [anna, ben];
  aStore.items = [jugendamt];
  rechnungStore.items = [r1, r2];
  render(
    <MemoryRouter>
      <RechnungListPage
        rechnungStore={rechnungStore}
        kindStore={kindStore}
        auftraggeberStore={aStore}
      />
    </MemoryRouter>,
  );
  return { rechnungStore };
}

describe('<RechnungListPage />', () => {
  it('renders filter controls and one row per Rechnung with formatted Gesamtsumme and download link', () => {
    const fetcher = vi.fn().mockResolvedValue({ rechnungen: [r1, r2] });
    renderPage(fetcher as unknown as GraphQLFetcher);

    for (const id of [
      'rechnung-list-filter-kindId',
      'rechnung-list-filter-auftraggeberId',
      'rechnung-list-filter-monat',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }

    const row1 = screen.getByTestId('rechnung-row-2026-04-0001');
    expect(row1).toHaveTextContent('Musterfrau, Anna');
    expect(row1).toHaveTextContent('Jugendamt Köln');
    expect(normalize(row1.textContent ?? '')).toContain('270,00 €');

    const row2 = screen.getByTestId('rechnung-row-2026-04-0002');
    expect(normalize(row2.textContent ?? '')).toContain('90,00 €');

    const link = screen.getByTestId('rechnung-row-2026-04-0001-download') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/bills/2026-04-0001-Anna_Musterfrau.pdf');
    expect(link.getAttribute('download')).toBe('2026-04-0001-Anna_Musterfrau.pdf');
  });

  it('changing the Kind filter calls rechnungen query with that kindId', async () => {
    const fetcher = vi.fn().mockResolvedValue({ rechnungen: [r1] });
    renderPage(fetcher as unknown as GraphQLFetcher);

    fireEvent.change(screen.getByTestId('rechnung-list-filter-kindId'), {
      target: { value: '10' },
    });
    await new Promise((r) => setTimeout(r, 20));

    // Find at least one call with kindId='10' (the initial load fires with no filter).
    const callsWithKind = fetcher.mock.calls.filter((c) => {
      const vars = c[1] as { kindId?: string | null } | undefined;
      return vars?.kindId === '10';
    });
    expect(callsWithKind.length).toBeGreaterThan(0);
  });

  it('changing the month filter calls rechnungen query with year and month', async () => {
    const fetcher = vi.fn().mockResolvedValue({ rechnungen: [r1, r2] });
    renderPage(fetcher as unknown as GraphQLFetcher);

    fireEvent.change(screen.getByTestId('rechnung-list-filter-monat'), {
      target: { value: '2026-04' },
    });
    await new Promise((r) => setTimeout(r, 20));

    const callsWithMonat = fetcher.mock.calls.filter((c) => {
      const vars = c[1] as { year?: number | null; month?: number | null } | undefined;
      return vars?.year === 2026 && vars?.month === 4;
    });
    expect(callsWithMonat.length).toBeGreaterThan(0);
  });

  it('shows an empty-state message when no rechnungen are loaded', () => {
    const fetcher = vi.fn().mockResolvedValue({ rechnungen: [] });
    const rechnungStore = new RechnungStore(fetcher as unknown as GraphQLFetcher);
    const kindStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    render(
      <MemoryRouter>
        <RechnungListPage
          rechnungStore={rechnungStore}
          kindStore={kindStore}
          auftraggeberStore={aStore}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('rechnung-list-empty')).toBeInTheDocument();
  });
});
