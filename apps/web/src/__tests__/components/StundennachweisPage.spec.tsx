import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';
import { KindStore, type Kind } from '../../models/KindStore';
import { StundennachweisStore } from '../../models/StundennachweisStore';
import { TherapieStore, type Therapie } from '../../models/TherapieStore';
import { StundennachweisPage } from '../../pages/StundennachweisPage';

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

const annaTherapie: Therapie = {
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

function renderPage(
  fetcher: GraphQLFetcher,
  opts: { kinder?: Kind[]; auftraggeber?: Auftraggeber[]; therapien?: Therapie[] } = {},
): { stundennachweisStore: StundennachweisStore } {
  const kindStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
  const auftraggeberStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
  const therapieStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
  const stundennachweisStore = new StundennachweisStore(fetcher);
  kindStore.items = opts.kinder ?? [anna];
  auftraggeberStore.items = opts.auftraggeber ?? [jugendamt];
  therapieStore.items = opts.therapien ?? [];
  render(
    <MemoryRouter>
      <StundennachweisPage
        kindStore={kindStore}
        auftraggeberStore={auftraggeberStore}
        stundennachweisStore={stundennachweisStore}
        therapieStore={therapieStore}
      />
    </MemoryRouter>,
  );
  return { stundennachweisStore };
}

describe('<StundennachweisPage />', () => {
  it('renders monat, Kind, Auftraggeber and submit controls', () => {
    renderPage(vi.fn() as unknown as GraphQLFetcher);
    for (const id of [
      'stundennachweis-monat',
      'stundennachweis-kindId',
      'stundennachweis-auftraggeberId',
      'stundennachweis-submit',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('submits createStundennachweis with the chosen year/month/kind/auftraggeber', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createStundennachweis: {
        nummer: 'RE-2026-04-0001',
        dateiname: 'ST-2026-04-0001-Anna_Musterfrau.pdf',
      },
    });
    renderPage(fetcher as unknown as GraphQLFetcher, { therapien: [annaTherapie] });

    fireEvent.change(screen.getByTestId('stundennachweis-monat'), {
      target: { value: '2026-04' },
    });
    fireEvent.change(screen.getByTestId('stundennachweis-kindId'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('stundennachweis-auftraggeberId'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByTestId('stundennachweis-submit'));

    await new Promise((r) => setTimeout(r, 20));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    const input = (
      variables as {
        input: { year: number; month: number; kindId: string; auftraggeberId: string };
      }
    ).input;
    expect(input).toEqual({ year: 2026, month: 4, kindId: '10', auftraggeberId: '20' });

    expect(await screen.findByTestId('stundennachweis-success')).toHaveTextContent(
      'ST-2026-04-0001-Anna_Musterfrau.pdf',
    );
  });

  it('shows the missing-Rechnung error banner when the server rejects', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Für diesen Monat wurde noch keine Rechnung erzeugt. Bitte zuerst die Rechnung anlegen.',
        ),
      );
    renderPage(fetcher as unknown as GraphQLFetcher, { therapien: [annaTherapie] });

    fireEvent.change(screen.getByTestId('stundennachweis-monat'), {
      target: { value: '2026-04' },
    });
    fireEvent.change(screen.getByTestId('stundennachweis-kindId'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('stundennachweis-auftraggeberId'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByTestId('stundennachweis-submit'));

    expect(await screen.findByTestId('stundennachweis-error')).toHaveTextContent(
      'Bitte zuerst die Rechnung anlegen',
    );
  });
});

describe('<StundennachweisPage /> Auftraggeber-Filter auf Therapien des Kindes', () => {
  const otto: Kind = { ...anna, id: '11', vorname: 'Otto', nachname: 'Beispiel' };
  const dachau: Auftraggeber = { ...jugendamt, id: '21', firmenname: 'Landratsamt Dachau' };
  const therapieAnnaJugendamt: Therapie = {
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

  it('only lists Auftraggeber that have a Therapie for the selected Kind', () => {
    const { stundennachweisStore } = renderPage(vi.fn() as unknown as GraphQLFetcher, {
      kinder: [anna, otto],
      auftraggeber: [jugendamt, dachau],
      therapien: [therapieAnnaJugendamt],
    });
    act(() => {
      stundennachweisStore.draftStundennachweis.setKindId('10');
    });
    const select = screen.getByTestId('stundennachweis-auftraggeberId') as HTMLSelectElement;
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(values).toContain('20');
    expect(values).not.toContain('21');
  });

  it('shows no Auftraggeber options for a Kind without any Therapie', () => {
    const { stundennachweisStore } = renderPage(vi.fn() as unknown as GraphQLFetcher, {
      kinder: [anna, otto],
      auftraggeber: [jugendamt, dachau],
      therapien: [therapieAnnaJugendamt],
    });
    act(() => {
      stundennachweisStore.draftStundennachweis.setKindId('11');
    });
    const select = screen.getByTestId('stundennachweis-auftraggeberId') as HTMLSelectElement;
    const realOptions = Array.from(select.querySelectorAll('option')).filter((o) => o.value !== '');
    expect(realOptions).toHaveLength(0);
  });

  it('clears auftraggeberId when the Kind change leaves it invalid', () => {
    const { stundennachweisStore } = renderPage(vi.fn() as unknown as GraphQLFetcher, {
      kinder: [anna, otto],
      auftraggeber: [jugendamt, dachau],
      therapien: [therapieAnnaJugendamt],
    });
    fireEvent.change(screen.getByTestId('stundennachweis-kindId'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('stundennachweis-auftraggeberId'), {
      target: { value: '20' },
    });
    expect(stundennachweisStore.draftStundennachweis.auftraggeberId).toBe('20');
    fireEvent.change(screen.getByTestId('stundennachweis-kindId'), { target: { value: '11' } });
    expect(stundennachweisStore.draftStundennachweis.auftraggeberId).toBe('');
  });
});
