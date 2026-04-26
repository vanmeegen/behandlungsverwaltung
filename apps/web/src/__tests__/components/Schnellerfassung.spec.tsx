import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { SchnellerfassungPage } from '../../pages/SchnellerfassungPage';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';
import { BehandlungStore } from '../../models/BehandlungStore';
import { KindStore, type Kind } from '../../models/KindStore';
import { TherapieStore, type Therapie } from '../../models/TherapieStore';

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
  rechnungskopfText: 'Mein Honorar …:',
};

const lern: Therapie = {
  id: '7',
  kindId: '10',
  auftraggeberId: '20',
  form: 'lerntherapie',
  kommentar: null,
  bewilligteBe: 60,
  taetigkeit: 'lerntherapie',
  gruppentherapie: false,
};

const lernOhneThema: Therapie = {
  id: '8',
  kindId: '10',
  auftraggeberId: '20',
  form: 'heilpaedagogik',
  kommentar: null,
  bewilligteBe: 40,
  taetigkeit: null,
  gruppentherapie: false,
};

function makeStores(): {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
  behandlungStore: BehandlungStore;
} {
  const kindStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
  const auftraggeberStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
  const therapieStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
  const behandlungStore = new BehandlungStore(vi.fn() as unknown as GraphQLFetcher);
  kindStore.items = [anna];
  auftraggeberStore.items = [jugendamt];
  therapieStore.items = [lern, lernOhneThema];
  return { kindStore, auftraggeberStore, therapieStore, behandlungStore };
}

function renderPage(): {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
  behandlungStore: BehandlungStore;
} {
  const stores = makeStores();
  render(
    <MemoryRouter>
      <SchnellerfassungPage
        kindStore={stores.kindStore}
        auftraggeberStore={stores.auftraggeberStore}
        therapieStore={stores.therapieStore}
        behandlungStore={stores.behandlungStore}
      />
    </MemoryRouter>,
  );
  return stores;
}

describe('<SchnellerfassungPage /> — inputs', () => {
  it('renders Kind / Therapie / BE stepper / Datum / Tätigkeit', () => {
    renderPage();
    for (const id of [
      'schnellerfassung-kindId',
      'schnellerfassung-therapieId',
      'schnellerfassung-be-minus',
      'schnellerfassung-be-plus',
      'schnellerfassung-be',
      'schnellerfassung-datum',
      'schnellerfassung-taetigkeit',
      'schnellerfassung-submit',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });
});

describe('<SchnellerfassungPage /> — Kind → Therapie cascade', () => {
  it('only offers Therapien of the selected Kind', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.draftBehandlung.setKindId('10');
    });
    const options = screen.getByTestId('schnellerfassung-therapieId').querySelectorAll('option');
    const values = Array.from(options).map((o) => o.value);
    expect(values).toContain('7');
    expect(values).toContain('8');
  });
});

describe('<SchnellerfassungPage /> — Tätigkeit Vorbelegung (AC-BEH-03)', () => {
  it('pre-fills taetigkeit with Therapie.taetigkeit on selection', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.draftBehandlung.setKindId('10');
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    expect(screen.getByTestId('schnellerfassung-taetigkeit')).toHaveValue('lerntherapie');
  });

  it('keeps the user-typed taetigkeit when the Therapie changes after manual edit', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.draftBehandlung.setKindId('10');
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-taetigkeit'), {
      target: { value: 'dyskalkulie' },
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '8' },
    });
    expect(screen.getByTestId('schnellerfassung-taetigkeit')).toHaveValue('dyskalkulie');
  });
});

describe('<SchnellerfassungPage /> — BE stepper', () => {
  it('starts at 1 and goes to 2 on plus', () => {
    renderPage();
    expect(screen.getByTestId('schnellerfassung-be')).toHaveTextContent('1');
    fireEvent.click(screen.getByTestId('schnellerfassung-be-plus'));
    expect(screen.getByTestId('schnellerfassung-be')).toHaveTextContent('2');
  });

  it('never drops below 1', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('schnellerfassung-be-minus'));
    fireEvent.click(screen.getByTestId('schnellerfassung-be-minus'));
    expect(screen.getByTestId('schnellerfassung-be')).toHaveTextContent('1');
  });
});

describe('<SchnellerfassungPage /> — submit', () => {
  it('calls createBehandlung with Vorbelegung on leave-as-is submit (AC-BEH-03)', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createBehandlung: {
        id: '1',
        therapieId: '7',
        datum: '2026-04-20T00:00:00.000Z',
        be: 2,
        taetigkeit: 'lerntherapie',
      },
    });
    const kindStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const auftraggeberStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const therapieStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    const behandlungStore = new BehandlungStore(fetcher as unknown as GraphQLFetcher);
    kindStore.items = [anna];
    auftraggeberStore.items = [jugendamt];
    therapieStore.items = [lern];
    render(
      <MemoryRouter>
        <SchnellerfassungPage
          kindStore={kindStore}
          auftraggeberStore={auftraggeberStore}
          therapieStore={therapieStore}
          behandlungStore={behandlungStore}
        />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('schnellerfassung-kindId'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByTestId('schnellerfassung-be-plus'));
    fireEvent.change(screen.getByTestId('schnellerfassung-datum'), {
      target: { value: '2026-04-20' },
    });
    fireEvent.click(screen.getByTestId('schnellerfassung-submit'));
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(variables).toEqual({
      input: {
        therapieId: '7',
        datum: '2026-04-20',
        be: 2,
        taetigkeit: 'lerntherapie',
      },
    });
  });
});
