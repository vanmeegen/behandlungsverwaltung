import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { TherapieForm } from '../../components/TherapieForm';
import { AuftraggeberStore, type Auftraggeber } from '../../models/AuftraggeberStore';
import { KindStore, type Kind } from '../../models/KindStore';
import { TherapieStore } from '../../models/TherapieStore';

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

function renderForm(
  tStore: TherapieStore,
  kStore: KindStore,
  aStore: AuftraggeberStore,
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <TherapieForm therapieStore={tStore} kindStore={kStore} auftraggeberStore={aStore} />
    </MemoryRouter>,
  );
}

describe('<TherapieForm /> — inputs', () => {
  it('renders a select/input for every column of §2.3', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    renderForm(tStore, kStore, aStore);
    for (const id of [
      'therapie-form-kindId',
      'therapie-form-auftraggeberId',
      'therapie-form-form',
      'therapie-form-startdatum',
      'therapie-form-bewilligteBe',
      'therapie-form-taetigkeit',
      'therapie-form-gruppentherapie',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('therapie-form-kommentar')).not.toBeInTheDocument();
  });

  it('renders Gruppentherapie checkbox unchecked by default (AC-TH-04)', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    renderForm(tStore, kStore, aStore);
    const checkbox = screen.getByTestId('therapie-form-gruppentherapie') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('toggles draft.gruppentherapie when the checkbox is clicked (AC-TH-04)', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    renderForm(tStore, kStore, aStore);
    const checkbox = screen.getByTestId('therapie-form-gruppentherapie') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(tStore.draftTherapie.gruppentherapie).toBe(true);
    expect(checkbox.checked).toBe(true);
  });

  it('shows kommentar input only when form=sonstiges (AC-TH-01 UI echo)', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    renderForm(tStore, kStore, aStore);
    act(() => {
      tStore.draftTherapie.setForm('sonstiges');
    });
    expect(screen.getByTestId('therapie-form-kommentar')).toBeInTheDocument();
  });
});

describe('<TherapieForm /> — presentation-model binding', () => {
  it('binds bewilligteBe input to setter', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    renderForm(tStore, kStore, aStore);
    fireEvent.change(screen.getByTestId('therapie-form-bewilligteBe'), {
      target: { value: '42' },
    });
    expect(tStore.draftTherapie.bewilligteBe).toBe(42);
  });

  it('reflects draftTherapie.setTaetigkeit in the rendered input', () => {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    renderForm(tStore, kStore, aStore);
    act(() => {
      tStore.draftTherapie.setTaetigkeit('dyskalkulie');
    });
    expect(screen.getByTestId('therapie-form-taetigkeit')).toHaveValue('dyskalkulie');
  });
});

describe('<TherapieForm /> — validation', () => {
  function ready(): {
    kStore: KindStore;
    aStore: AuftraggeberStore;
    tStore: TherapieStore;
  } {
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    return { kStore, aStore, tStore };
  }

  it('shows "Kommentar ist Pflicht bei Sonstiges" when form=sonstiges and kommentar empty', () => {
    const { kStore, aStore, tStore } = ready();
    tStore.draftTherapie.setKindId('10');
    tStore.draftTherapie.setAuftraggeberId('20');
    tStore.draftTherapie.setForm('sonstiges');
    tStore.draftTherapie.setBewilligteBe(60);
    renderForm(tStore, kStore, aStore);
    fireEvent.click(screen.getByTestId('therapie-form-submit'));
    expect(screen.getByTestId('therapie-form-kommentar-error')).toHaveTextContent(
      'Kommentar ist Pflicht bei Sonstiges',
    );
  });

  it('shows Startdatum validation error when startdatum is empty on submit (AC-TH-05)', () => {
    const fetcher = vi.fn();
    const { kStore, aStore, tStore } = ready();
    tStore.draftTherapie.setKindId('10');
    tStore.draftTherapie.setAuftraggeberId('20');
    tStore.draftTherapie.setForm('lerntherapie');
    tStore.draftTherapie.setBewilligteBe(60);
    renderForm(tStore, kStore, aStore);
    fireEvent.click(screen.getByTestId('therapie-form-submit'));
    expect(screen.getByTestId('therapie-form-startdatum-error')).toHaveTextContent(
      'Startdatum ist Pflicht',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('submits with null kommentar and null taetigkeit when left empty', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createTherapie: {
        id: '1',
        kindId: '10',
        auftraggeberId: '20',
        form: 'lerntherapie',
        kommentar: null,
        startdatum: '2026-04-01',
        bewilligteBe: 60,
        taetigkeit: null,
        gruppentherapie: false,
      },
    });
    const kStore = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const aStore = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    const tStore = new TherapieStore(fetcher as unknown as GraphQLFetcher);
    kStore.items = [anna];
    aStore.items = [jugendamt];
    tStore.draftTherapie.setKindId('10');
    tStore.draftTherapie.setAuftraggeberId('20');
    tStore.draftTherapie.setForm('lerntherapie');
    tStore.draftTherapie.setStartdatum('2026-04-01');
    tStore.draftTherapie.setBewilligteBe(60);
    renderForm(tStore, kStore, aStore);
    fireEvent.click(screen.getByTestId('therapie-form-submit'));
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const variables = (fetcher.mock.calls[0] as [string, Record<string, unknown>])[1];
    expect(variables).toEqual({
      input: {
        kindId: '10',
        auftraggeberId: '20',
        form: 'lerntherapie',
        kommentar: null,
        startdatum: '2026-04-01',
        bewilligteBe: 60,
        taetigkeit: null,
        gruppentherapie: false,
      },
    });
  });
});
