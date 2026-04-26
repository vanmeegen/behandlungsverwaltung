import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
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

function makeFetcher(map: Record<string, unknown>): GraphQLFetcher {
  return vi.fn(async (query: string) => {
    for (const [needle, value] of Object.entries(map)) {
      if (query.includes(needle)) return value;
    }
    throw new Error(`unexpected query: ${query}`);
  }) as unknown as GraphQLFetcher;
}

describe('AuftraggeberStore.load', () => {
  it('populates items from the auftraggeber query', async () => {
    const fetcher = makeFetcher({ 'auftraggeber {': { auftraggeber: [firma, person] } });
    const store = new AuftraggeberStore(fetcher);
    await store.load();
    expect(store.items).toHaveLength(2);
    expect(store.items[0]).toEqual(firma);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('records the rejection reason on store.error', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as GraphQLFetcher;
    const store = new AuftraggeberStore(fetcher);
    await store.load();
    expect(store.items).toEqual([]);
    expect(store.error).toBe('network down');
  });
});

describe('AuftraggeberStore.draftAuftraggeber', () => {
  it('exposes a setter per Auftraggeber field that mutates the observable', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('firma');
    store.draftAuftraggeber.setFirmenname('Jugendamt Köln');
    store.draftAuftraggeber.setVorname('Petra');
    store.draftAuftraggeber.setNachname('Privatzahlerin');
    store.draftAuftraggeber.setStrasse('Hauptstr.');
    store.draftAuftraggeber.setHausnummer('12');
    store.draftAuftraggeber.setPlz('50667');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('45,00');

    expect(store.draftAuftraggeber.typ).toBe('firma');
    expect(store.draftAuftraggeber.firmenname).toBe('Jugendamt Köln');
    expect(store.draftAuftraggeber.vorname).toBe('Petra');
    expect(store.draftAuftraggeber.nachname).toBe('Privatzahlerin');
    expect(store.draftAuftraggeber.strasse).toBe('Hauptstr.');
    expect(store.draftAuftraggeber.hausnummer).toBe('12');
    expect(store.draftAuftraggeber.plz).toBe('50667');
    expect(store.draftAuftraggeber.stadt).toBe('Köln');
    expect(store.draftAuftraggeber.stundensatz).toBe('45,00');
  });

  it('reset() returns every field to defaults', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setFirmenname('Acme');
    store.draftAuftraggeber.setTyp('person');
    store.draftAuftraggeber.reset();
    expect(store.draftAuftraggeber.firmenname).toBe('');
    expect(store.draftAuftraggeber.typ).toBe('firma');
    expect(store.draftAuftraggeber.editingId).toBeNull();
  });
});

describe('AuftraggeberStore.saveDraft — Firma', () => {
  let fetcher: ReturnType<typeof vi.fn>;
  let store: AuftraggeberStore;

  beforeEach(() => {
    fetcher = vi.fn();
    store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('firma');
    store.draftAuftraggeber.setFirmenname('Jugendamt Köln');
    store.draftAuftraggeber.setStrasse('Kalker Hauptstr.');
    store.draftAuftraggeber.setHausnummer('247-273');
    store.draftAuftraggeber.setPlz('51103');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('45,00');
    store.draftAuftraggeber.setRechnungskopfText('Mein Honorar …:');
  });

  it('dispatches createAuftraggeber with stundensatzCents=4500 and null vorname/nachname', async () => {
    fetcher.mockResolvedValue({ createAuftraggeber: firma });
    await store.saveDraft();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('createAuftraggeber(');
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
        abteilung: null,
        rechnungskopfText: 'Mein Honorar …:',
      },
    });
    expect(store.items).toContainEqual(firma);
  });

  it('refuses to submit when stundensatz is malformed and surfaces field error', async () => {
    store.draftAuftraggeber.setStundensatz('45,5');
    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftAuftraggeber.errors.stundensatzCents).toBe('Stundensatz muss > 0 sein');
  });
});

describe('AuftraggeberStore.saveDraft — Person', () => {
  it('dispatches createAuftraggeber with vorname/nachname and null firmenname', async () => {
    const fetcher = vi.fn().mockResolvedValue({ createAuftraggeber: person });
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('person');
    store.draftAuftraggeber.setVorname('Petra');
    store.draftAuftraggeber.setNachname('Privatzahlerin');
    store.draftAuftraggeber.setStrasse('Lindenallee');
    store.draftAuftraggeber.setHausnummer('7');
    store.draftAuftraggeber.setPlz('50667');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('60,00');
    store.draftAuftraggeber.setRechnungskopfText('Mein Honorar …:');

    await store.saveDraft();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(variables).toEqual({
      input: {
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
      },
    });
  });

  it('refuses to submit a Person without vorname/nachname and surfaces error', async () => {
    const fetcher = vi.fn();
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('person');
    store.draftAuftraggeber.setStrasse('Lindenallee');
    store.draftAuftraggeber.setHausnummer('7');
    store.draftAuftraggeber.setPlz('50667');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('45,00');
    store.draftAuftraggeber.setRechnungskopfText('Mein Honorar …:');

    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftAuftraggeber.errors.vorname).toBe('Vor- und Nachname Pflicht');
  });
});

describe('AuftraggeberStore.draftAuftraggeber — Abteilung & Rechnungskopf-Text (AC-AG-04, AC-AG-05)', () => {
  it('exposes setAbteilung/setRechnungskopfText that mutate the observable', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setAbteilung('Wirtschaftliche Jugendhilfe');
    store.draftAuftraggeber.setRechnungskopfText('Multi\nLine');
    expect(store.draftAuftraggeber.abteilung).toBe('Wirtschaftliche Jugendhilfe');
    expect(store.draftAuftraggeber.rechnungskopfText).toBe('Multi\nLine');
  });

  it('reset() clears abteilung and rechnungskopfText', () => {
    const store = new AuftraggeberStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setAbteilung('X');
    store.draftAuftraggeber.setRechnungskopfText('Y');
    store.draftAuftraggeber.reset();
    expect(store.draftAuftraggeber.abteilung).toBe('');
    expect(store.draftAuftraggeber.rechnungskopfText).toBe('');
  });

  it('refuses to submit Firma without rechnungskopfText (AC-AG-05)', async () => {
    const fetcher = vi.fn();
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('firma');
    store.draftAuftraggeber.setFirmenname('Jugendamt Köln');
    store.draftAuftraggeber.setStrasse('Kalker Hauptstr.');
    store.draftAuftraggeber.setHausnummer('247-273');
    store.draftAuftraggeber.setPlz('51103');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('45,00');

    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftAuftraggeber.errors.rechnungskopfText).toBe('Rechnungskopf-Text ist Pflicht');
  });

  it('passes abteilung through on submit when typ=firma (AC-AG-04)', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createAuftraggeber: { ...firma, abteilung: 'Wirtschaftliche Jugendhilfe' },
    });
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('firma');
    store.draftAuftraggeber.setFirmenname('Jugendamt Köln');
    store.draftAuftraggeber.setStrasse('Kalker Hauptstr.');
    store.draftAuftraggeber.setHausnummer('247-273');
    store.draftAuftraggeber.setPlz('51103');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('45,00');
    store.draftAuftraggeber.setAbteilung('Wirtschaftliche Jugendhilfe');
    store.draftAuftraggeber.setRechnungskopfText('Mein Honorar …:');

    await store.saveDraft();
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect((variables.input as Record<string, unknown>).abteilung).toBe(
      'Wirtschaftliche Jugendhilfe',
    );
  });

  it('drops abteilung when typ=person (AC-AG-04)', async () => {
    const fetcher = vi.fn().mockResolvedValue({ createAuftraggeber: person });
    const store = new AuftraggeberStore(fetcher as unknown as GraphQLFetcher);
    store.draftAuftraggeber.setTyp('person');
    store.draftAuftraggeber.setVorname('Petra');
    store.draftAuftraggeber.setNachname('Privatzahlerin');
    store.draftAuftraggeber.setStrasse('Lindenallee');
    store.draftAuftraggeber.setHausnummer('7');
    store.draftAuftraggeber.setPlz('50667');
    store.draftAuftraggeber.setStadt('Köln');
    store.draftAuftraggeber.setStundensatz('60,00');
    store.draftAuftraggeber.setAbteilung('Wird ignoriert');
    store.draftAuftraggeber.setRechnungskopfText('Mein Honorar …:');

    await store.saveDraft();
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect((variables.input as Record<string, unknown>).abteilung).toBeNull();
  });
});
