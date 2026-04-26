import { describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { TemplateStore } from '../../models/TemplateStore';

describe('TemplateStore.upload', () => {
  it('dispatches uploadTemplate with base64 and auftraggeberId', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      uploadTemplate: {
        id: '1',
        kind: 'rechnung',
        auftraggeberId: '5',
        filename: 'rechnung-5.pdf',
      },
    });
    const store = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    await store.upload({ kind: 'rechnung', auftraggeberId: '5', base64: 'JVBE...' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('uploadTemplate(');
    expect(variables).toEqual({
      input: { kind: 'rechnung', auftraggeberId: '5', base64: 'JVBE...' },
    });
  });

  it('treats an empty auftraggeberId as global (null)', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      uploadTemplate: {
        id: '1',
        kind: 'rechnung',
        auftraggeberId: null,
        filename: 'rechnung-global.pdf',
      },
    });
    const store = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    await store.upload({ kind: 'rechnung', auftraggeberId: '', base64: 'JVBE...' });
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(variables).toEqual({
      input: { kind: 'rechnung', auftraggeberId: null, base64: 'JVBE...' },
    });
  });

  it('surfaces fetcher errors on store.error', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error('Datei ist keine PDF')) as unknown as GraphQLFetcher;
    const store = new TemplateStore(fetcher);
    const result = await store.upload({ kind: 'rechnung', auftraggeberId: '', base64: 'ZIP' });
    expect(result).toBeNull();
    expect(store.error).toBe('Datei ist keine PDF');
  });
});

describe('TemplateStore.remove (Bug 3)', () => {
  it('dispatches deleteTemplate with kind + auftraggeberId and removes the row from items', async () => {
    const fetcher = vi.fn().mockResolvedValue({ deleteTemplate: true });
    const store = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    store.items = [
      { id: '1', kind: 'rechnung', auftraggeberId: '5', filename: 'a.pdf' },
      { id: '2', kind: 'rechnung', auftraggeberId: null, filename: 'b.pdf' },
    ];
    const ok = await store.remove({ kind: 'rechnung', auftraggeberId: '5' });
    expect(ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('deleteTemplate');
    expect(variables).toEqual({ kind: 'rechnung', auftraggeberId: '5' });
    expect(store.items).toHaveLength(1);
    expect(store.items[0]!.id).toBe('2');
  });

  it('removes the global row when auftraggeberId is null', async () => {
    const fetcher = vi.fn().mockResolvedValue({ deleteTemplate: true });
    const store = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    store.items = [
      { id: '1', kind: 'rechnung', auftraggeberId: '5', filename: 'a.pdf' },
      { id: '2', kind: 'rechnung', auftraggeberId: null, filename: 'b.pdf' },
    ];
    await store.remove({ kind: 'rechnung', auftraggeberId: null });
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(variables).toEqual({ kind: 'rechnung', auftraggeberId: null });
    expect(store.items.map((t) => t.id)).toEqual(['1']);
  });

  it('surfaces fetcher errors on store.error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Vorlage nicht gefunden'));
    const store = new TemplateStore(fetcher as unknown as GraphQLFetcher);
    const ok = await store.remove({ kind: 'rechnung', auftraggeberId: '5' });
    expect(ok).toBe(false);
    expect(store.error).toBe('Vorlage nicht gefunden');
  });
});
