import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { KindForm } from '../../components/KindForm';
import { ErziehungsberechtigterStore } from '../../models/ErziehungsberechtigterStore';
import { KindStore } from '../../models/KindStore';

function renderForm(
  store: KindStore,
  ezbStore?: ErziehungsberechtigterStore,
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <KindForm store={store} ezbStore={ezbStore} />
    </MemoryRouter>,
  );
}

const FIELD_IDS = [
  'kind-form-vorname',
  'kind-form-nachname',
  'kind-form-geburtsdatum',
  'kind-form-strasse',
  'kind-form-hausnummer',
  'kind-form-plz',
  'kind-form-stadt',
  'kind-form-aktenzeichen',
] as const;

describe('<KindForm /> — presentation-model binding', () => {
  it('renders an input for every Kind column required by PRD §2.1', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    for (const id of FIELD_IDS) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('reflects draftKind mutations without React state (store.draftKind.setPlz propagates)', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    act(() => {
      store.draftKind.setPlz('50667');
    });
    expect(screen.getByTestId('kind-form-plz')).toHaveValue('50667');
  });

  it('binds each input to its setter on the draft', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    fireEvent.change(screen.getByTestId('kind-form-vorname'), { target: { value: 'Anna' } });
    expect(store.draftKind.vorname).toBe('Anna');
  });
});

describe('<KindForm /> — validation', () => {
  function fillAllBut(store: KindStore, skip: string): void {
    const values: Record<string, string> = {
      vorname: 'Anna',
      nachname: 'Musterfrau',
      geburtsdatum: '2018-03-14',
      strasse: 'Hauptstr.',
      hausnummer: '12',
      plz: '50667',
      stadt: 'Köln',
      aktenzeichen: 'K-2026-001',
    };
    for (const [field, v] of Object.entries(values)) {
      if (field === skip) continue;
      const setter =
        `set${field[0]!.toUpperCase()}${field.slice(1)}` as keyof typeof store.draftKind;
      const fn = store.draftKind[setter] as (value: string) => void;
      fn(v);
    }
  }

  it('shows "PLZ ist Pflicht" inline when submitted with empty PLZ (AC-KIND-02)', () => {
    const fetcher = vi.fn();
    const store = new KindStore(fetcher as unknown as GraphQLFetcher);
    fillAllBut(store, 'plz');
    renderForm(store);
    fireEvent.click(screen.getByTestId('kind-form-submit'));
    expect(screen.getByTestId('kind-form-plz-error')).toHaveTextContent('PLZ ist Pflicht');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows "Vorname ist Pflicht" when submitted with empty Vorname', () => {
    const fetcher = vi.fn();
    const store = new KindStore(fetcher as unknown as GraphQLFetcher);
    fillAllBut(store, 'vorname');
    renderForm(store);
    fireEvent.click(screen.getByTestId('kind-form-submit'));
    expect(screen.getByTestId('kind-form-vorname-error')).toHaveTextContent('Vorname ist Pflicht');
  });

  it('shows "Geburtsdatum ist ungültig" for a wrong-format date', () => {
    const fetcher = vi.fn();
    const store = new KindStore(fetcher as unknown as GraphQLFetcher);
    fillAllBut(store, 'geburtsdatum');
    store.draftKind.setGeburtsdatum('14.03.2018');
    renderForm(store);
    fireEvent.click(screen.getByTestId('kind-form-submit'));
    expect(screen.getByTestId('kind-form-geburtsdatum-error')).toHaveTextContent(
      'Geburtsdatum ist ungültig',
    );
  });

  it('calls store.saveDraft exactly once with all 8 typed values on a fully valid submit', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createKind: {
        id: '1',
        vorname: 'Anna',
        nachname: 'Musterfrau',
        geburtsdatum: '2018-03-14',
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-001',
      },
    });
    const store = new KindStore(fetcher as unknown as GraphQLFetcher);
    fillAllBut(store, '__none__');
    renderForm(store);
    fireEvent.click(screen.getByTestId('kind-form-submit'));
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const variables = (fetcher.mock.calls[0] as [string, Record<string, unknown>])[1];
    expect(variables).toEqual({
      input: {
        vorname: 'Anna',
        nachname: 'Musterfrau',
        geburtsdatum: '2018-03-14',
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-001',
      },
    });
  });
});

describe('<KindForm /> — Erziehungsberechtigte Slots (AC-KIND-04, AC-KIND-05)', () => {
  it('shows two EZB slots when in edit mode (editingId set)', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const ezbStore = new ErziehungsberechtigterStore(vi.fn() as unknown as GraphQLFetcher);
    act(() => {
      store.draftKind.setEditingId('10');
    });
    renderForm(store, ezbStore);
    expect(screen.getByTestId('kind-form-ezb-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('kind-form-ezb-slot-2')).toBeInTheDocument();
  });

  it('does not show EZB slots when not in edit mode (no editingId)', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    const ezbStore = new ErziehungsberechtigterStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store, ezbStore);
    expect(screen.queryByTestId('kind-form-ezb-slot-1')).not.toBeInTheDocument();
  });
});
