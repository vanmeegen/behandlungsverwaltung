import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { BehandlungStore } from '../../models/BehandlungStore';

describe('BehandlungStore.draftBehandlung', () => {
  let store: BehandlungStore;

  beforeEach(() => {
    store = new BehandlungStore(vi.fn() as unknown as GraphQLFetcher);
  });

  it('defaults be to 1 and datum to today (ISO yyyy-mm-dd)', () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(today.getDate()).padStart(2, '0')}`;
    expect(store.draftBehandlung.be).toBe(1);
    expect(store.draftBehandlung.datum).toBe(iso);
  });

  it('incrementBe / decrementBe never drops below 1', () => {
    store.draftBehandlung.decrementBe();
    expect(store.draftBehandlung.be).toBe(1);
    store.draftBehandlung.incrementBe();
    store.draftBehandlung.incrementBe();
    expect(store.draftBehandlung.be).toBe(3);
    store.draftBehandlung.decrementBe();
    expect(store.draftBehandlung.be).toBe(2);
  });

  it('setTherapie(id, default) pre-fills taetigkeit when untouched (AC-BEH-03)', () => {
    store.draftBehandlung.setTherapie('7', 'lerntherapie');
    expect(store.draftBehandlung.therapieId).toBe('7');
    expect(store.draftBehandlung.taetigkeit).toBe('lerntherapie');
  });

  it('setTaetigkeit marks the field as touched and setTherapie stops overwriting', () => {
    store.draftBehandlung.setTherapie('7', 'lerntherapie');
    store.draftBehandlung.setTaetigkeit('dyskalkulie');
    store.draftBehandlung.setTherapie('8', 'foerderplan');
    expect(store.draftBehandlung.therapieId).toBe('8');
    expect(store.draftBehandlung.taetigkeit).toBe('dyskalkulie');
  });

  it('setKindId resets therapieId and taetigkeit (and untouches)', () => {
    store.draftBehandlung.setTherapie('7', 'lerntherapie');
    store.draftBehandlung.setTaetigkeit('dyskalkulie');
    store.draftBehandlung.setKindId('42');
    expect(store.draftBehandlung.kindId).toBe('42');
    expect(store.draftBehandlung.therapieId).toBe('');
    expect(store.draftBehandlung.taetigkeit).toBe('');
  });
});

describe('BehandlungStore.saveDraft', () => {
  it('dispatches createBehandlung with the draft input (taetigkeit from Vorbelegung)', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createBehandlung: {
        id: '1',
        therapieId: '7',
        datum: '2026-04-20T00:00:00.000Z',
        be: 2,
        taetigkeit: 'lerntherapie',
      },
    });
    const store = new BehandlungStore(fetcher as unknown as GraphQLFetcher);
    store.draftBehandlung.setKindId('1');
    store.draftBehandlung.setTherapie('7', 'lerntherapie');
    store.draftBehandlung.setDatum('2026-04-20');
    store.draftBehandlung.setBe(2);

    await store.saveDraft();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('createBehandlung(');
    expect(variables).toEqual({
      input: {
        therapieId: '7',
        datum: '2026-04-20',
        be: 2,
        taetigkeit: 'lerntherapie',
      },
    });
  });

  it('refuses to submit when therapieId is empty', async () => {
    const fetcher = vi.fn();
    const store = new BehandlungStore(fetcher as unknown as GraphQLFetcher);
    store.draftBehandlung.setDatum('2026-04-20');
    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftBehandlung.errors.therapieId).toBeDefined();
  });

  it('sends null taetigkeit when the draft is empty', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createBehandlung: {
        id: '1',
        therapieId: '7',
        datum: '2026-04-20T00:00:00.000Z',
        be: 1,
        taetigkeit: null,
      },
    });
    const store = new BehandlungStore(fetcher as unknown as GraphQLFetcher);
    store.draftBehandlung.setTherapie('7', null);
    store.draftBehandlung.setDatum('2026-04-20');
    await store.saveDraft();
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(variables).toEqual({
      input: {
        therapieId: '7',
        datum: '2026-04-20',
        be: 1,
        taetigkeit: null,
      },
    });
  });
});

describe('BehandlungStore.loadByTherapie', () => {
  it('caches results per therapieId', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      behandlungenByTherapie: [
        {
          id: '1',
          therapieId: '7',
          datum: '2026-04-20T00:00:00.000Z',
          be: 2,
          taetigkeit: 'X',
        },
      ],
    });
    const store = new BehandlungStore(fetcher as unknown as GraphQLFetcher);
    await store.loadByTherapie('7');
    expect(store.byTherapie['7']).toHaveLength(1);
  });
});
