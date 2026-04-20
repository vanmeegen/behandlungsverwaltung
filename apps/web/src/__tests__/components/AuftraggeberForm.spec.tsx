import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { AuftraggeberForm } from '../../components/AuftraggeberForm';
import { AuftraggeberStore } from '../../models/AuftraggeberStore';

function renderForm(store: AuftraggeberStore): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AuftraggeberForm store={store} />
    </MemoryRouter>,
  );
}

describe('<AuftraggeberForm /> — typ switch', () => {
  it('shows firmenname input and hides vorname/nachname when typ=firma', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    act(() => {
      store.draftAuftraggeber.setTyp('firma');
    });
    renderForm(store);
    expect(screen.getByTestId('auftraggeber-form-firmenname')).toBeInTheDocument();
    expect(screen.queryByTestId('auftraggeber-form-vorname')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auftraggeber-form-nachname')).not.toBeInTheDocument();
  });

  it('shows vorname/nachname and hides firmenname when typ=person', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    act(() => {
      store.draftAuftraggeber.setTyp('person');
    });
    expect(screen.getByTestId('auftraggeber-form-vorname')).toBeInTheDocument();
    expect(screen.getByTestId('auftraggeber-form-nachname')).toBeInTheDocument();
    expect(screen.queryByTestId('auftraggeber-form-firmenname')).not.toBeInTheDocument();
  });

  it('renders shared address/stundensatz inputs regardless of typ', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    for (const id of [
      'auftraggeber-form-typ-firma',
      'auftraggeber-form-typ-person',
      'auftraggeber-form-strasse',
      'auftraggeber-form-hausnummer',
      'auftraggeber-form-plz',
      'auftraggeber-form-stadt',
      'auftraggeber-form-stundensatz',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });
});

describe('<AuftraggeberForm /> — presentation-model binding', () => {
  it('propagates draftAuftraggeber.setPlz to the rendered input without React state', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    act(() => {
      store.draftAuftraggeber.setPlz('50667');
    });
    expect(screen.getByTestId('auftraggeber-form-plz')).toHaveValue('50667');
  });

  it('binds firmenname input to setter', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    renderForm(store);
    fireEvent.change(screen.getByTestId('auftraggeber-form-firmenname'), {
      target: { value: 'Acme' },
    });
    expect(store.draftAuftraggeber.firmenname).toBe('Acme');
  });
});

describe('<AuftraggeberForm /> — validation', () => {
  function fillFirmaExcept(store: AuftraggeberStore, skip: string): void {
    const values: Record<string, string> = {
      firmenname: 'Jugendamt Köln',
      strasse: 'Kalker Hauptstr.',
      hausnummer: '247-273',
      plz: '51103',
      stadt: 'Köln',
      stundensatz: '45,00',
    };
    store.draftAuftraggeber.setTyp('firma');
    for (const [field, v] of Object.entries(values)) {
      if (field === skip) continue;
      const setter =
        `set${field[0]!.toUpperCase()}${field.slice(1)}` as keyof AuftraggeberStore['draftAuftraggeber'];
      const fn = store.draftAuftraggeber[setter] as (value: string) => void;
      fn(v);
    }
  }

  it('shows "PLZ ist Pflicht" inline for empty PLZ (AC-AG-03)', () => {
    const fetcher = vi.fn();
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    fillFirmaExcept(store, 'plz');
    renderForm(store);
    fireEvent.click(screen.getByTestId('auftraggeber-form-submit'));
    expect(screen.getByTestId('auftraggeber-form-plz-error')).toHaveTextContent('PLZ ist Pflicht');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows "Firmenname Pflicht" when typ=firma and firmenname is empty', () => {
    const fetcher = vi.fn();
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    fillFirmaExcept(store, 'firmenname');
    renderForm(store);
    fireEvent.click(screen.getByTestId('auftraggeber-form-submit'));
    expect(screen.getByTestId('auftraggeber-form-firmenname-error')).toHaveTextContent(
      'Firmenname Pflicht',
    );
  });

  it('shows "Vor- und Nachname Pflicht" when typ=person and vorname empty (AC-AG-02)', () => {
    const fetcher = vi.fn();
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('person');
    store.draftAuftraggeber.setNachname('Musterfrau');
    store.draftAuftraggeber.setStrasse('Lindenallee');
    store.draftAuftraggeber.setHausnummer('7');
    store.draftAuftraggeber.setPlz('50667');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('45,00');
    renderForm(store);
    fireEvent.click(screen.getByTestId('auftraggeber-form-submit'));
    expect(screen.getByTestId('auftraggeber-form-vorname-error')).toHaveTextContent(
      'Vor- und Nachname Pflicht',
    );
  });

  it('shows "Stundensatz muss > 0 sein" for malformed stundensatz', () => {
    const fetcher = vi.fn();
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    fillFirmaExcept(store, 'stundensatz');
    store.draftAuftraggeber.setStundensatz('45,5');
    renderForm(store);
    fireEvent.click(screen.getByTestId('auftraggeber-form-submit'));
    expect(screen.getByTestId('auftraggeber-form-stundensatzCents-error')).toHaveTextContent(
      'Stundensatz muss > 0 sein',
    );
  });

  it('calls fetcher exactly once with typed values on a fully valid Firma submit', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createAuftraggeber: {
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
      },
    });
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    fillFirmaExcept(store, '__none__');
    renderForm(store);
    fireEvent.click(screen.getByTestId('auftraggeber-form-submit'));
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const variables = (fetcher.mock.calls[0] as [string, Record<string, unknown>])[1];
    expect(variables).toEqual({
      input: {
        typ: 'firma',
        firmenname: 'Jugendamt Köln',
        vorname: null,
        nachname: null,
        strasse: 'Kalker Hauptstr.',
        hausnummer: '247-273',
        plz: '51103',
        stadt: 'Köln',
        stundensatzCents: 4500,
      },
    });
  });
});
