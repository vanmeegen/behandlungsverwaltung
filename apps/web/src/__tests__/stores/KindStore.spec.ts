import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { KindStore, type Kind } from '../../models/KindStore';

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

function makeFetcher(map: Record<string, unknown>): GraphQLFetcher {
  return vi.fn(async (query: string) => {
    for (const [needle, value] of Object.entries(map)) {
      if (query.includes(needle)) return value;
    }
    throw new Error(`unexpected query: ${query}`);
  }) as unknown as GraphQLFetcher;
}

describe('KindStore.load', () => {
  it('populates items from the kinder query', async () => {
    const fetcher = makeFetcher({ 'kinder {': { kinder: [kindAnna, kindBen] } });
    const store = new KindStore(fetcher);
    await store.load();
    expect(store.items).toHaveLength(2);
    expect(store.items[0]).toEqual(kindAnna);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('records the rejection reason on store.error and leaves items empty', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as GraphQLFetcher;
    const store = new KindStore(fetcher);
    await store.load();
    expect(store.items).toEqual([]);
    expect(store.error).toBe('network down');
    expect(store.loading).toBe(false);
  });
});

describe('KindStore.draftKind', () => {
  it('exposes a setter per Kind field that mutates the observable', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftKind.setVorname('Anna');
    store.draftKind.setNachname('Musterfrau');
    store.draftKind.setGeburtsdatum('2018-03-14');
    store.draftKind.setStrasse('Hauptstr.');
    store.draftKind.setHausnummer('12');
    store.draftKind.setPlz('50667');
    store.draftKind.setStadt('Köln');
    store.draftKind.setAktenzeichen('K-2026-001');

    expect(store.draftKind.vorname).toBe('Anna');
    expect(store.draftKind.nachname).toBe('Musterfrau');
    expect(store.draftKind.geburtsdatum).toBe('2018-03-14');
    expect(store.draftKind.strasse).toBe('Hauptstr.');
    expect(store.draftKind.hausnummer).toBe('12');
    expect(store.draftKind.plz).toBe('50667');
    expect(store.draftKind.stadt).toBe('Köln');
    expect(store.draftKind.aktenzeichen).toBe('K-2026-001');
  });

  it('reset() returns every field to the empty string', () => {
    const store = new KindStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftKind.setVorname('Anna');
    store.draftKind.setPlz('50667');
    store.draftKind.reset();
    expect(store.draftKind.vorname).toBe('');
    expect(store.draftKind.plz).toBe('');
    expect(store.draftKind.editingId).toBeNull();
  });
});

describe('KindStore.saveDraft', () => {
  let fetcher: ReturnType<typeof vi.fn>;
  let store: KindStore;

  beforeEach(() => {
    fetcher = vi.fn();
    store = new KindStore(fetcher as unknown as GraphQLFetcher);
    store.draftKind.setVorname('Anna');
    store.draftKind.setNachname('Musterfrau');
    store.draftKind.setGeburtsdatum('2018-03-14');
    store.draftKind.setStrasse('Hauptstr.');
    store.draftKind.setHausnummer('12');
    store.draftKind.setPlz('50667');
    store.draftKind.setStadt('Köln');
    store.draftKind.setAktenzeichen('K-2026-001');
  });

  it('dispatches createKind when editingId is null and appends the returned Kind', async () => {
    fetcher.mockResolvedValue({ createKind: kindAnna });
    await store.saveDraft();

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('createKind(');
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
    expect(store.items).toContainEqual(kindAnna);
  });

  it('dispatches updateKind when editingId is set and replaces the existing row', async () => {
    store.items = [kindAnna];
    store.startEdit(kindAnna);
    store.draftKind.setNachname('Beispiel');
    const updated = { ...kindAnna, nachname: 'Beispiel' };
    fetcher.mockResolvedValue({ updateKind: updated });

    await store.saveDraft();

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('updateKind(');
    expect(variables).toEqual({
      id: '1',
      input: {
        vorname: 'Anna',
        nachname: 'Beispiel',
        geburtsdatum: '2018-03-14',
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-001',
      },
    });
    expect(store.items).toEqual([updated]);
  });

  it('surfaces a fetcher error on store.error and leaves items unchanged', async () => {
    fetcher.mockRejectedValue(new Error('PLZ ist Pflicht'));
    await store.saveDraft();
    expect(store.error).toBe('PLZ ist Pflicht');
    expect(store.items).toEqual([]);
  });
});
