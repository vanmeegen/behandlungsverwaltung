import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
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
import {
  createMonatsrechnung,
  RechnungExistiertError,
  RechnungsnummerDuplicateError,
} from '../../services/rechnungService';
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
        rechnungskopfText: 'Mein Honorar …:',
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
        taetigkeit: 'lerntherapie',
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
          taetigkeit: 'lerntherapie',
        },
        {
          therapieId,
          datum: new Date('2026-04-15T00:00:00.000Z'),
          be: 2,
          taetigkeit: 'lerntherapie',
        },
        {
          therapieId,
          datum: new Date('2026-04-29T00:00:00.000Z'),
          be: 2,
          taetigkeit: 'lerntherapie',
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
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
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
      expect(s.snapshotTaetigkeit).toBe('lerntherapie');
      expect(s.snapshotZeilenbetragCents).toBe(9000);
    }
  });

  it('throws RechnungExistiertError on duplicate (year, month, kind, auftraggeber)', async () => {
    await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
    });
    await expect(
      createMonatsrechnung(ctx.db, ctx.paths, {
        year: 2026,
        month: 4,
        kindId,
        auftraggeberId,
        rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(RechnungExistiertError);
    const all = ctx.db.select().from(rechnungen).all();
    expect(all).toHaveLength(1);
  });

  it('uses an explicit lfdNummer in the produced Rechnungsnummer (AC-RECH-15)', async () => {
    const row = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
      lfdNummer: 7,
    });
    expect(row.nummer).toBe('RE-2026-04-0007');
    expect(row.dateiname).toBe('RE-2026-04-0007-Anna_Musterfrau.pdf');
  });

  it('throws RechnungsnummerDuplicateError when reusing a lfdNummer in the same year', async () => {
    // First Rechnung uses lfdNummer = 7 in April 2026.
    await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
      lfdNummer: 7,
    });
    // A second Kind so we don't trip the (year/month/kind/auftraggeber)
    // unique key — we want the lfd-collision to surface.
    const [k2] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Ben',
        nachname: 'Beispiel',
        geburtsdatum: new Date('2019-05-10T00:00:00.000Z'),
        strasse: 'Lindenallee',
        hausnummer: '7',
        plz: '51103',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-002',
      })
      .returning()
      .all();
    ctx.db
      .insert(therapien)
      .values({
        kindId: k2!.id,
        auftraggeberId,
        form: 'lerntherapie',
        bewilligteBe: 60,
        taetigkeit: 'lerntherapie',
      })
      .returning()
      .all();
    const therapienRows = ctx.db.select().from(therapien).all();
    const t2 = therapienRows.find((t) => t.kindId === k2!.id)!;
    ctx.db
      .insert(behandlungen)
      .values([
        {
          therapieId: t2.id,
          datum: new Date('2026-05-04T00:00:00.000Z'),
          be: 2,
          taetigkeit: 'lerntherapie',
        },
      ])
      .run();

    await expect(
      createMonatsrechnung(ctx.db, ctx.paths, {
        year: 2026,
        month: 5,
        kindId: k2!.id,
        auftraggeberId,
        rechnungsdatum: new Date('2026-06-01T00:00:00.000Z'),
        lfdNummer: 7,
      }),
    ).rejects.toBeInstanceOf(RechnungsnummerDuplicateError);
  });

  it('allows the same lfdNummer in a different year', async () => {
    // Insert a Rechnung with lfd=7 in 2025 (different year) directly.
    ctx.db
      .insert(rechnungen)
      .values({
        nummer: 'RE-2025-04-0007',
        jahr: 2025,
        monat: 4,
        kindId,
        auftraggeberId,
        stundensatzCentsSnapshot: 4500,
        gesamtCents: 9000,
        dateiname: 'RE-2025-04-0007-Anna_Musterfrau.pdf',
      })
      .run();
    const row = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
      lfdNummer: 7,
    });
    expect(row.nummer).toBe('RE-2026-04-0007');
  });

  it('ignores lfdNummer on force=true correction (PRD §4: Nummer bleibt)', async () => {
    const first = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(first.nummer).toBe('RE-2026-04-0001');

    const second = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-20T00:00:00.000Z'),
      force: true,
      // User attempt to override — must be silently ignored on force=true.
      lfdNummer: 42,
    });
    expect(second.nummer).toBe('RE-2026-04-0001');
    expect(second.id).toBe(first.id);
  });

  it('force=true keeps the nummer, overwrites the PDF, resets downloadedAt (PRD §3.2, §4)', async () => {
    const first = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-02T00:00:00.000Z'),
    });
    // Simulate: the Therapeutin already marked this as downloaded.
    ctx.db
      .update(rechnungen)
      .set({ downloadedAt: new Date('2026-04-10T00:00:00.000Z') })
      .where(eq(rechnungen.id, first.id))
      .run();

    // Correct one behandlung (BE bump) and re-run with force.
    const behandlungRows = ctx.db.select().from(behandlungen).all();
    ctx.db
      .update(behandlungen)
      .set({ be: 4 })
      .where(eq(behandlungen.id, behandlungRows[0]!.id))
      .run();

    const second = await createMonatsrechnung(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId,
      auftraggeberId,
      rechnungsdatum: new Date('2026-05-20T00:00:00.000Z'),
      force: true,
    });

    expect(second.nummer).toBe(first.nummer);
    expect(second.id).toBe(first.id);
    expect(second.gesamtCents).toBe(36000); // (4 + 2 + 2) BE * 4500 cents
    expect(second.downloadedAt).toBeNull();
    expect(second.rechnungsdatum.toISOString()).toBe('2026-05-20T00:00:00.000Z');

    const all = ctx.db.select().from(rechnungen).all();
    expect(all).toHaveLength(1);

    const snapshots = ctx.db.select().from(rechnungBehandlungen).all();
    expect(snapshots).toHaveLength(3);
  });
});
