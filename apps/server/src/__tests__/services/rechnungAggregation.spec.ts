import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { auftraggeber, behandlungen, kinder, therapien } from '../../db/schema';
import { collectBehandlungen, KeineBehandlungenError } from '../../services/rechnungAggregation';
import { createTestDb, type TestDb } from '../helpers/testDb';

describe('collectBehandlungen', () => {
  let ctx: TestDb;
  let kindAnnaId: number;
  let kindBenId: number;
  let agId: number;
  let therapieAnnaId: number;
  let therapieBenId: number;

  beforeEach(() => {
    ctx = createTestDb();
    const [anna] = ctx.db
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
    kindAnnaId = anna!.id;
    const [ben] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Ben',
        nachname: 'Beispiel',
        geburtsdatum: new Date('2019-05-10T00:00:00.000Z'),
        strasse: 'Weg',
        hausnummer: '1',
        plz: '51103',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-002',
      })
      .returning()
      .all();
    kindBenId = ben!.id;
    const [ag] = ctx.db
      .insert(auftraggeber)
      .values({
        typ: 'firma',
        firmenname: 'Jugendamt Köln',
        strasse: 'Str',
        hausnummer: '1',
        plz: '51103',
        stadt: 'Köln',
        stundensatzCents: 4500,
        rechnungskopfText: 'Mein Honorar …:',
      })
      .returning()
      .all();
    agId = ag!.id;
    const [tAnna] = ctx.db
      .insert(therapien)
      .values({ kindId: kindAnnaId, auftraggeberId: agId, form: 'lerntherapie', bewilligteBe: 60 })
      .returning()
      .all();
    therapieAnnaId = tAnna!.id;
    const [tBen] = ctx.db
      .insert(therapien)
      .values({ kindId: kindBenId, auftraggeberId: agId, form: 'lerntherapie', bewilligteBe: 30 })
      .returning()
      .all();
    therapieBenId = tBen!.id;
    ctx.db
      .insert(behandlungen)
      .values([
        { therapieId: therapieAnnaId, datum: new Date('2026-04-15T00:00:00.000Z'), be: 2 },
        { therapieId: therapieAnnaId, datum: new Date('2026-04-01T00:00:00.000Z'), be: 1 },
        { therapieId: therapieAnnaId, datum: new Date('2026-04-29T00:00:00.000Z'), be: 3 },
        // other month
        { therapieId: therapieAnnaId, datum: new Date('2026-05-03T00:00:00.000Z'), be: 2 },
        // other kind
        { therapieId: therapieBenId, datum: new Date('2026-04-10T00:00:00.000Z'), be: 1 },
      ])
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns only April Anna rows, ordered by datum ascending', () => {
    const rows = collectBehandlungen(ctx.db, {
      year: 2026,
      month: 4,
      kindId: kindAnnaId,
      auftraggeberId: agId,
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.datum.toISOString().slice(0, 10))).toEqual([
      '2026-04-01',
      '2026-04-15',
      '2026-04-29',
    ]);
  });

  it('throws KeineBehandlungenError for an empty month', () => {
    expect(() =>
      collectBehandlungen(ctx.db, {
        year: 2026,
        month: 3,
        kindId: kindAnnaId,
        auftraggeberId: agId,
      }),
    ).toThrow(KeineBehandlungenError);
  });
});
