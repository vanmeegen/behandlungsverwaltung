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
