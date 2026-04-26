import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber, behandlungen, kinder, therapien } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const CREATE_BEHANDLUNG = /* GraphQL */ `
  mutation CreateBehandlung($input: BehandlungInput!) {
    createBehandlung(input: $input) {
      id
      therapieId
      datum
      be
      taetigkeit
    }
  }
`;

interface Seeded {
  kindId: number;
  auftraggeberId: number;
  therapieWithThemaId: number;
  therapieOhneThemaId: number;
}

function seed(ctx: TestDb): Seeded {
  const [k] = ctx.db
    .insert(kinder)
    .values({
      vorname: 'Anna',
      nachname: 'Musterfrau',
      geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
      strasse: 'Hauptstr.',
      hausnummer: '12',
      plz: '50667',
      stadt: 'Köln',
      aktenzeichen: 'K-2026-001',
    })
    .returning()
    .all();
  const [a] = ctx.db
    .insert(auftraggeber)
    .values({
      typ: 'firma',
      firmenname: 'Jugendamt Köln',
      strasse: 'Kalker Hauptstr.',
      hausnummer: '247-273',
      plz: '51103',
      stadt: 'Köln',
      stundensatzCents: 4500,
      rechnungskopfText: 'Mein Honorar …:',
    })
    .returning()
    .all();
  const [tWith] = ctx.db
    .insert(therapien)
    .values({
      kindId: k!.id,
      auftraggeberId: a!.id,
      form: 'lerntherapie',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
    })
    .returning()
    .all();
  const [tNone] = ctx.db
    .insert(therapien)
    .values({
      kindId: k!.id,
      auftraggeberId: a!.id,
      form: 'heilpaedagogik',
      bewilligteBe: 40,
      taetigkeit: null,
    })
    .returning()
    .all();
  return {
    kindId: k!.id,
    auftraggeberId: a!.id,
    therapieWithThemaId: tWith!.id,
    therapieOhneThemaId: tNone!.id,
  };
}

describe('createBehandlung mutation (PRD §2.4, AC-BEH-02, AC-BEH-03)', () => {
  let ctx: TestDb;
  let seeded: Seeded;

  beforeEach(() => {
    ctx = createTestDb();
    seeded = seed(ctx);
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function run(input: Record<string, unknown>): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: CREATE_BEHANDLUNG,
      variableValues: { input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  it('rejects be=0 with "BE muss ≥ 1 sein" (AC-BEH-02)', async () => {
    const result = await run({
      therapieId: String(seeded.therapieWithThemaId),
      datum: '2026-04-15',
      be: 0,
    });
    expect(result.errors?.[0]?.message).toBe('BE muss ≥ 1 sein');
    expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');
    expect(ctx.db.select().from(behandlungen).all()).toHaveLength(0);
  });

  it('rejects malformed datum', async () => {
    const result = await run({
      therapieId: String(seeded.therapieWithThemaId),
      datum: '15.04.2026',
      be: 1,
    });
    expect(result.errors?.[0]?.message).toBe('Datum ist ungültig');
  });

  it('snapshots taetigkeit from Therapie when input is absent (AC-BEH-03)', async () => {
    const result = await run({
      therapieId: String(seeded.therapieWithThemaId),
      datum: '2026-04-15',
      be: 2,
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(behandlungen).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.taetigkeit).toBe('lerntherapie');
    expect(rows[0]?.be).toBe(2);
  });

  it('uses override when taetigkeit is explicitly provided (AC-BEH-03)', async () => {
    const result = await run({
      therapieId: String(seeded.therapieWithThemaId),
      datum: '2026-04-15',
      be: 2,
      taetigkeit: 'dyskalkulie',
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(behandlungen).all();
    expect(rows[0]?.taetigkeit).toBe('dyskalkulie');
  });

  it('missing taetigkeit falls back to the Therapie-Tätigkeit (AC-BEH-03)', async () => {
    const result = await run({
      therapieId: String(seeded.therapieWithThemaId),
      datum: '2026-04-15',
      be: 2,
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(behandlungen).all();
    expect(rows[0]?.taetigkeit).toBe('lerntherapie');
  });

  it('leaves taetigkeit null when neither input nor Therapie has one', async () => {
    const result = await run({
      therapieId: String(seeded.therapieOhneThemaId),
      datum: '2026-04-15',
      be: 1,
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(behandlungen).all();
    expect(rows[0]?.taetigkeit).toBeNull();
  });

  it('persists every column for a valid create', async () => {
    const result = await run({
      therapieId: String(seeded.therapieWithThemaId),
      datum: '2026-04-15',
      be: 3,
      taetigkeit: 'foerderplan',
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(behandlungen).all();
    expect(rows[0]?.therapieId).toBe(seeded.therapieWithThemaId);
    expect(rows[0]?.datum.toISOString().slice(0, 10)).toBe('2026-04-15');
    expect(rows[0]?.be).toBe(3);
    expect(rows[0]?.taetigkeit).toBe('foerderplan');
  });

  it('errors when therapieId points at non-existent Therapie', async () => {
    const result = await run({
      therapieId: '999999',
      datum: '2026-04-15',
      be: 1,
    });
    expect(result.errors).toBeDefined();
  });
});
