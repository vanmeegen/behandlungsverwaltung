import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {
  auftraggeber,
  behandlungen,
  kinder,
  rechnungBehandlungen,
  rechnungen,
  templateFiles,
  therapien,
} from '../../db/schema';
import { createMonatsrechnung, RechnungExistiertError } from '../../services/rechnungService';
import { createTestDb, type TestDb } from '../helpers/testDb';

async function writeBlankTemplate(ctx: TestDb, filename: string): Promise<void> {
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  const bytes = await doc.save();
  writeFileSync(join(ctx.paths.templatesDir, filename), Buffer.from(bytes));
}

describe('createMonatsrechnung (AC-RECH-01, AC-RECH-05, AC-RECH-09)', () => {
  let ctx: TestDb;
  let kindId: number;
  let auftraggeberId: number;
  let therapieId: number;

  beforeEach(async () => {
    ctx = createTestDb();
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
    kindId = k!.id;
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
      })
      .returning()
      .all();
    auftraggeberId = a!.id;
    const [t] = ctx.db
      .insert(therapien)
      .values({
        kindId,
        auftraggeberId,
        form: 'lerntherapie',
        bewilligteBe: 60,
        arbeitsthema: 'Mathe-Grundlagen',
      })
      .returning()
      .all();
    therapieId = t!.id;
    ctx.db
      .insert(behandlungen)
      .values([
        {
          therapieId,
          datum: new Date('2026-04-01T00:00:00.000Z'),
          be: 2,
          arbeitsthema: 'Mathe-Grundlagen',
        },
        {
          therapieId,
          datum: new Date('2026-04-15T00:00:00.000Z'),
          be: 2,
          arbeitsthema: 'Mathe-Grundlagen',
        },
        {
          therapieId,
          datum: new Date('2026-04-29T00:00:00.000Z'),
          be: 2,
          arbeitsthema: 'Mathe-Grundlagen',
        },
      ])
      .run();
    // Global rechnung template on disk + DB row.
    await writeBlankTemplate(ctx, 'rechnung-global.pdf');
    ctx.db
      .insert(templateFiles)
      .values({ kind: 'rechnung', auftraggeberId: null, filename: 'rechnung-global.pdf' })
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('creates a rechnung row, PDF file under bills/, and three snapshot lines', async () => {
    const row = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
    });
    expect(row.nummer).toBe('RE-2026-04-0001');
    expect(row.gesamtCents).toBe(27000);
    expect(row.stundensatzCentsSnapshot).toBe(4500);
    expect(row.dateiname).toBe('RE-2026-04-0001-Anna_Musterfrau.pdf');

    const filePath = join(ctx.paths.billsDir, row.dateiname);
    expect(existsSync(filePath)).toBe(true);
    const bytes = readFileSync(filePath);
    expect(bytes.byteLength).toBeGreaterThan(200);

    const snapshots = ctx.db.select().from(rechnungBehandlungen).all();
    expect(snapshots).toHaveLength(3);
    for (const s of snapshots) {
      expect(s.snapshotBe).toBe(2);
      expect(s.snapshotArbeitsthema).toBe('Mathe-Grundlagen');
      expect(s.snapshotZeilenbetragCents).toBe(9000);
    }
  });

  it('throws RechnungExistiertError on duplicate (year, month, kind, auftraggeber)', async () => {
    await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
    });
    await expect(
      createMonatsrechnung(ctx.db, ctx.paths, {
        year: 2026,
        month: 4,
        kindId,
        auftraggeberId,
      }),
    ).rejects.toBeInstanceOf(RechnungExistiertError);
    const all = ctx.db.select().from(rechnungen).all();
    expect(all).toHaveLength(1);
  });
});
