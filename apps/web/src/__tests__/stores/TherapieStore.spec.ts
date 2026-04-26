import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQLFetcher } from '../../api/graphqlClient';
import { TherapieStore, type Therapie } from '../../models/TherapieStore';

const lerntherapie: Therapie = {
  id: '1',
  kindId: '10',
  auftraggeberId: '20',
  form: 'lerntherapie',
  kommentar: null,
  startdatum: '2026-01-01',
  bewilligteBe: 60,
  taetigkeit: 'lerntherapie',
  gruppentherapie: false,
};

describe('TherapieStore.load', () => {
  it('populates items from the therapien query', async () => {
    const fetcher = vi.fn(async (q: string) => {
      if (q.includes('therapien {')) return { therapien: [lerntherapie] };
      throw new Error(`unexpected: ${q}`);
    }) as unknown as GraphQLFetcher;
    const store = new TherapieStore(fetcher);
    await store.load();
    expect(store.items).toEqual([lerntherapie]);
  });
});

describe('TherapieStore.draftTherapie', () => {
  it('setters mutate each observable field', () => {
    const store = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    store.draftTherapie.setKindId('10');
    store.draftTherapie.setAuftraggeberId('20');
    store.draftTherapie.setForm('lerntherapie');
    store.draftTherapie.setKommentar('irrelevant');
    store.draftTherapie.setBewilligteBe(60);
    store.draftTherapie.setTaetigkeit('lerntherapie');
    store.draftTherapie.setGruppentherapie(true);
    expect(store.draftTherapie.kindId).toBe('10');
    expect(store.draftTherapie.auftraggeberId).toBe('20');
    expect(store.draftTherapie.form).toBe('lerntherapie');
    expect(store.draftTherapie.kommentar).toBe('irrelevant');
    expect(store.draftTherapie.bewilligteBe).toBe(60);
    expect(store.draftTherapie.taetigkeit).toBe('lerntherapie');
    expect(store.draftTherapie.gruppentherapie).toBe(true);
  });

  it('defaults gruppentherapie to false on a fresh draft (AC-TH-04)', () => {
    const store = new TherapieStore(vi.fn() as unknown as GraphQLFetcher);
    expect(store.draftTherapie.gruppentherapie).toBe(false);
  });
});

describe('TherapieStore.saveDraft', () => {
  let fetcher: ReturnType<typeof vi.fn>;
  let store: TherapieStore;

  beforeEach(() => {
    fetcher = vi.fn();
    store = new TherapieStore(fetcher as unknown as GraphQLFetcher);
    store.draftTherapie.setKindId('10');
    store.draftTherapie.setAuftraggeberId('20');
    store.draftTherapie.setForm('lerntherapie');
    store.draftTherapie.setStartdatum('2026-01-01');
    store.draftTherapie.setBewilligteBe(60);
    store.draftTherapie.setTaetigkeit('lerntherapie');
  });

  it('dispatches createTherapie with full input on a valid Lerntherapie', async () => {
    fetcher.mockResolvedValue({ createTherapie: lerntherapie });
    await store.saveDraft();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [query, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('createTherapie(');
    expect(variables).toEqual({
      input: {
        kindId: '10',
        auftraggeberId: '20',
        form: 'lerntherapie',
        kommentar: null,
        startdatum: '2026-01-01',
        bewilligteBe: 60,
        taetigkeit: 'lerntherapie',
        gruppentherapie: false,
      },
    });
    expect(store.items).toContainEqual(lerntherapie);
  });

  it('refuses to submit form=sonstiges without kommentar and surfaces error (AC-TH-01)', async () => {
    store.draftTherapie.setForm('sonstiges');
    store.draftTherapie.setKommentar('');
    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftTherapie.errors.kommentar).toBe('Kommentar ist Pflicht bei Sonstiges');
  });

  it('refuses to submit when bewilligteBe <= 0', async () => {
    store.draftTherapie.setBewilligteBe(0);
    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftTherapie.errors.bewilligteBe).toBe(
      'Bewilligte Behandlungseinheiten müssen > 0 sein',
    );
  });

  it('refuses to submit when kindId is empty', async () => {
    store.draftTherapie.setKindId('');
    const saved = await store.saveDraft();
    expect(saved).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(store.draftTherapie.errors.kindId).toBeDefined();
  });

  it('sends gruppentherapie=true when the checkbox is set (AC-TH-04)', async () => {
    fetcher.mockResolvedValue({ createTherapie: { ...lerntherapie, gruppentherapie: true } });
    store.draftTherapie.setGruppentherapie(true);
    await store.saveDraft();
    const [, variables] = fetcher.mock.calls[0] as [string, Record<string, unknown>];
    expect((variables.input as { gruppentherapie: boolean }).gruppentherapie).toBe(true);
  });
});
