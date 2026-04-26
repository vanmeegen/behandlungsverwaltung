import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';
import { KindStore, type Kind } from '../../models/KindStore';
import { RechnungStore } from '../../models/RechnungStore';
import { RechnungCreatePage } from '../../pages/RechnungCreatePage';
import { theme } from '../../theme';

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
  abteilung: null,
  rechnungskopfText: 'Mein Honorar:',
};

interface Stores {
  rechnungStore: RechnungStore;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
}

function renderPage(fetcher: GraphQLFetcher, year = 2026, month = 4): Stores {
  const rechnungStore = new RechnungStore(fetcher);
  const kindStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
  const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
  kindStore.items = [anna];
  aStore.items = [jugendamt];
  rechnungStore.draftRechnung.setYear(year);
  rechnungStore.draftRechnung.setMonth(month);
  render(
    <ThemeProvider theme={theme}>
      <RechnungCreatePage
        rechnungStore={rechnungStore}
        kindStore={kindStore}
        auftraggeberStore={aStore}
      />
    </ThemeProvider>,
  );
  return { rechnungStore, kindStore, auftraggeberStore: aStore };
}

describe('<RechnungCreatePage /> Direktlink „Rechnung öffnen" (AC-RECH-19)', () => {
  it('shows a "Rechnung öffnen" link after successful creation', async () => {
    const fetcher = vi.fn().mockImplementation((q: string) => {
      if (q.includes('nextFreeRechnungsLfdNummer'))
        return Promise.resolve({ nextFreeRechnungsLfdNummer: 1 });
      return Promise.resolve({
        createMonatsrechnung: {
          id: '1',
          nummer: 'RE-2026-04-0001',
          jahr: 2026,
          monat: 4,
          kindId: '10',
          auftraggeberId: '20',
          stundensatzCentsSnapshot: 4500,
          gesamtCents: 27000,
          dateiname: 'RE-2026-04-0001-Anna_Musterfrau.pdf',
          downloadedAt: null,
          rechnungsdatum: '2026-05-02',
        },
      });
    });
    const { rechnungStore } = renderPage(fetcher as unknown as GraphQLFetcher);
    rechnungStore.draftRechnung.setKindId('10');
    rechnungStore.draftRechnung.setAuftraggeberId('20');
    await rechnungStore.saveDraft();
    await waitFor(() => {
      expect(screen.getByTestId('rechnung-create-success-link')).toBeInTheDocument();
    });
    const link = screen.getByTestId('rechnung-create-success-link');
    expect(link).toHaveAttribute('href', '/bills/RE-2026-04-0001-Anna_Musterfrau.pdf');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveTextContent('Rechnung öffnen');
  });
});

describe('<RechnungCreatePage /> NNNN editing (PRD §3.2 / AC-RECH-15)', () => {
  it('renders the read-only RE-YYYY-MM- prefix and a four-digit NNNN field', async () => {
    const fetcher = vi.fn().mockResolvedValue({ nextFreeRechnungsLfdNummer: 1 });
    renderPage(fetcher as unknown as GraphQLFetcher, 2026, 4);

    const prefix = screen.getByTestId('rechnung-create-prefix');
    expect(prefix).toHaveTextContent('RE-2026-04-');

    await waitFor(() => {
      expect((screen.getByTestId('rechnung-create-lfd') as HTMLInputElement).value).toBe('0001');
    });
  });

  it('user-typed NNNN replaces the prefilled value (AC-RECH-15)', async () => {
    const fetcher = vi.fn().mockResolvedValue({ nextFreeRechnungsLfdNummer: 1 });
    const { rechnungStore } = renderPage(fetcher as unknown as GraphQLFetcher, 2026, 4);

    const input = screen.getByTestId('rechnung-create-lfd') as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('0001'));

    fireEvent.change(input, { target: { value: '0007' } });
    expect(rechnungStore.draftRechnung.lfdNummer).toBe(7);
    expect(rechnungStore.draftRechnung.lfdNummerTouched).toBe(true);
    expect((screen.getByTestId('rechnung-create-lfd') as HTMLInputElement).value).toBe('0007');
  });

  it('renders a red Alert for DUPLICATE_RECHNUNGSNUMMER', async () => {
    const fetcher = vi.fn().mockImplementation((query: string) => {
      if (query.includes('nextFreeRechnungsLfdNummer')) {
        return Promise.resolve({ nextFreeRechnungsLfdNummer: 1 });
      }
      return Promise.reject(new Error('Diese Nummer ist im Jahr 2026 bereits vergeben.'));
    });
    const { rechnungStore } = renderPage(fetcher as unknown as GraphQLFetcher, 2026, 4);
    // Trigger an error path through the store API so MobX picks up the change.
    rechnungStore.draftRechnung.setKindId('10');
    rechnungStore.draftRechnung.setAuftraggeberId('20');
    rechnungStore.draftRechnung.setLfdNummer(7);
    await rechnungStore.saveDraft();
    await waitFor(() => {
      expect(screen.getByTestId('rechnung-create-duplicate-nummer')).toHaveTextContent(
        'Diese Nummer ist im Jahr 2026 bereits vergeben.',
      );
    });
  });
});
