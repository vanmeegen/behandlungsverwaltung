import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { StundennachweisStore } from '../../models/StundennachweisStore';

describe('StundennachweisStore.saveDraft', () => {
  it('dispatches createStundennachweis and stores the result as lastCreated', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      createStundennachweis: {
        nummer: '2026-04-0001',
        dateiname: '2026-04-0001-Anna_Musterfrau.pdf',
      },
    });
    const store = new StundennachweisStore(fetcher as unknown as GraphQLFetcher);
    store.draftStundennachweis.setYear(2026);
    store.draftStundennachweis.setMonth(4);
    store.draftStundennachweis.setKindId('10');
    store.draftStundennachweis.setAuftraggeberId('20');

    const r = await store.saveDraft();
    expect(r?.nummer).toBe('2026-04-0001');
    expect(store.lastCreated?.dateiname).toBe('2026-04-0001-Anna_Musterfrau.pdf');
    expect(store.error).toBeNull();
  });

  it('maps the missing-Rechnung error from the German message text', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Für diesen Monat wurde noch keine Rechnung erzeugt. Bitte zuerst die Rechnung anlegen.',
        ),
      ) as unknown as GraphQLFetcher;
    const store = new StundennachweisStore(fetcher);
    store.draftStundennachweis.setKindId('10');
    store.draftStundennachweis.setAuftraggeberId('20');
    const r = await store.saveDraft();
    expect(r).toBeNull();
    expect(store.error?.code).toBe('RECHNUNG_FEHLT');
  });

  it('maps the missing-template errors', async () => {
    const notFound = vi
      .fn()
      .mockRejectedValue(
        new Error('Keine Stundennachweis-Vorlage hinterlegt.'),
      ) as unknown as GraphQLFetcher;
    const store1 = new StundennachweisStore(notFound);
    store1.draftStundennachweis.setKindId('10');
    store1.draftStundennachweis.setAuftraggeberId('20');
    await store1.saveDraft();
    expect(store1.error?.code).toBe('TEMPLATE_NOT_FOUND');

    const fileMissing = vi
      .fn()
      .mockRejectedValue(
        new Error('Vorlagen-Datei fehlt auf der Festplatte.'),
      ) as unknown as GraphQLFetcher;
    const store2 = new StundennachweisStore(fileMissing);
    store2.draftStundennachweis.setKindId('10');
    store2.draftStundennachweis.setAuftraggeberId('20');
    await store2.saveDraft();
    expect(store2.error?.code).toBe('TEMPLATE_FILE_MISSING');
  });

  it('refuses saveDraft when required fields are empty', async () => {
    const fetcher = vi.fn();
    const store = new StundennachweisStore(fetcher as unknown as GraphQLFetcher);
    const r = await store.saveDraft();
    expect(r).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
