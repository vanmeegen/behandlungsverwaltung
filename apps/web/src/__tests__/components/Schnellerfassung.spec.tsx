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
  startdatum: '2026-01-01',
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
  startdatum: '2026-01-01',
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

  it('shows the localized Therapieform label, not the raw enum id (Bug 2)', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.draftBehandlung.setKindId('10');
    });
    const options = screen.getByTestId('schnellerfassung-therapieId').querySelectorAll('option');
    const lernOption = Array.from(options).find((o) => o.value === '7');
    expect(lernOption).toBeDefined();
    expect(lernOption!.textContent).toContain('Lern-Therapie');
    expect(lernOption!.textContent).not.toContain('lerntherapie');
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

describe('<SchnellerfassungPage /> — Gruppentherapie Vorbelegung (AC-BEH-06)', () => {
  it('renders the Gruppentherapie checkbox', () => {
    renderPage();
    expect(screen.getByTestId('behandlung-form-gruppentherapie')).toBeInTheDocument();
  });

  it('pre-fills gruppentherapie from BehandlungStore.therapieGruppentherapieById', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.therapieGruppentherapieById = { '7': true, '8': false };
      behandlungStore.draftBehandlung.setKindId('10');
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    const checkbox = screen.getByTestId('behandlung-form-gruppentherapie') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('keeps the user-toggled gruppentherapie when Therapie changes after manual edit', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.therapieGruppentherapieById = { '7': false, '8': true };
      behandlungStore.draftBehandlung.setKindId('10');
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByTestId('behandlung-form-gruppentherapie'));
    // User has now manually checked the box
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '8' },
    });
    const checkbox = screen.getByTestId('behandlung-form-gruppentherapie') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('defaults gruppentherapie to false when no map entry exists', () => {
    const { behandlungStore } = renderPage();
    act(() => {
      behandlungStore.draftBehandlung.setKindId('10');
    });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    const checkbox = screen.getByTestId('behandlung-form-gruppentherapie') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
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
    const fetcher = vi.fn().mockImplementation(async (query: string) => {
      if (query.includes('createBehandlung')) {
        return {
          createBehandlung: {
            id: '1',
            therapieId: '7',
            datum: '2026-04-20T00:00:00.000Z',
            be: 2,
            taetigkeit: 'lerntherapie',
            gruppentherapie: false,
          },
        };
      }
      // TherapieGruppentherapie query
      return { therapien: [{ id: '7', gruppentherapie: false }] };
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
    const createCall = fetcher.mock.calls.find(
      ([q]) => typeof q === 'string' && q.includes('createBehandlung'),
    );
    expect(createCall).toBeDefined();
    const variables = createCall?.[1] as Record<string, unknown>;
    expect((variables?.input as Record<string, unknown>)?.therapieId).toBe('7');
    expect((variables?.input as Record<string, unknown>)?.be).toBe(2);
    expect((variables?.input as Record<string, unknown>)?.sonstigesText).toBeNull();
  });
});

describe('<SchnellerfassungPage /> — Sonstiges-Freitext (AC-BEH-08)', () => {
  const sonstigesTherapie: Therapie = {
    id: '9',
    kindId: '10',
    auftraggeberId: '20',
    form: 'sonstiges',
    kommentar: 'Individuelle Maßnahme',
    startdatum: '2026-01-01',
    bewilligteBe: 30,
    taetigkeit: 'sonstiges',
    gruppentherapie: false,
  };

  function renderWithSonstiges(fetcher: ReturnType<typeof vi.fn>): void {
    const kStore = new KindStore(fetcher as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(fetcher as unknown as GraphQLFetcher);
    const bStore = new BehandlungStore(fetcher as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    tStore.items = [sonstigesTherapie];
    render(
      <MemoryRouter>
        <SchnellerfassungPage
          kindStore={kStore}
          therapieStore={tStore}
          auftraggeberStore={aStore}
          behandlungStore={bStore}
        />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('schnellerfassung-kindId'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '9' },
    });
  }

  it('shows sonstiges-text field when taetigkeit=sonstiges', () => {
    const fetcher = vi.fn();
    renderWithSonstiges(fetcher);
    expect(screen.getByTestId('behandlung-form-sonstiges-text')).toBeInTheDocument();
  });

  it('hides sonstiges-text field when taetigkeit!=sonstiges', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    const bStore = new BehandlungStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    tStore.items = [lern];
    render(
      <MemoryRouter>
        <SchnellerfassungPage
          kindStore={kStore}
          therapieStore={tStore}
          auftraggeberStore={aStore}
          behandlungStore={bStore}
        />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('schnellerfassung-kindId'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('schnellerfassung-therapieId'), {
      target: { value: '7' },
    });
    expect(screen.queryByTestId('behandlung-form-sonstiges-text')).not.toBeInTheDocument();
  });
});
