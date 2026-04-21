import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { RechnungStore } from '../../models/RechnungStore';

describe('RechnungStore.create', () => {
  it('dispatches createMonatsrechnung and stores the returned row as lastCreated', async () => {
    const fetcher = vi.fn().mockResolvedValue({
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
        rechnungsdatum: '2026-05-02T00:00:00.000Z',
      },
    });
    const store = new RechnungStore(fetcher as unknown as GraphQLFetcher);
    const result = await store.create({
      year: 2026,
      month: 4,
      kindId: '10',
      auftraggeberId: '20',
      rechnungsdatum: '2026-05-02',
    });
    expect(result?.nummer).toBe('RE-2026-04-0001');
    expect(store.lastCreated?.nummer).toBe('RE-2026-04-0001');
    expect(store.items).toHaveLength(1);
  });

  it('detects the duplicate-Rechnung error from the German message text', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        new Error('Für diesen Monat wurde bereits eine Rechnung erzeugt.'),
      ) as unknown as GraphQLFetcher;
    const store = new RechnungStore(fetcher);
    const r = await store.create({
      year: 2026,
      month: 4,
      kindId: '10',
      auftraggeberId: '20',
      rechnungsdatum: '2026-05-02',
    });
    expect(r).toBeNull();
    expect(store.error?.code).toBe('DUPLICATE_RECHNUNG');
    expect(store.error?.message).toBe('Für diesen Monat wurde bereits eine Rechnung erzeugt.');
  });

  it('detects the empty-month error from the German message text', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        new Error('Für den gewählten Monat liegen keine Behandlungen vor.'),
      ) as unknown as GraphQLFetcher;
    const store = new RechnungStore(fetcher);
    await store.create({
      year: 2026,
      month: 4,
      kindId: '10',
      auftraggeberId: '20',
      rechnungsdatum: '2026-05-02',
    });
    expect(store.error?.code).toBe('KEINE_BEHANDLUNGEN');
  });

  it('refuses saveDraft when required fields are empty', async () => {
    const fetcher = vi.fn();
    const store = new RechnungStore(fetcher as unknown as GraphQLFetcher);
    const r = await store.saveDraft();
    expect(r).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('draft defaults rechnungsdatum to today ISO', async () => {
    const fetcher = vi.fn();
    const store = new RechnungStore(fetcher as unknown as GraphQLFetcher);
    expect(store.draftRechnung.rechnungsdatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('draft is invalid when rechnungsdatum is cleared', async () => {
    const fetcher = vi.fn();
    const store = new RechnungStore(fetcher as unknown as GraphQLFetcher);
    store.draftRechnung.setKindId('10');
    store.draftRechnung.setAuftraggeberId('20');
    expect(store.draftRechnung.valid()).toBe(true);
    store.draftRechnung.setRechnungsdatum('');
    expect(store.draftRechnung.valid()).toBe(false);
  });
});
