import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { auftraggeber, kinder, rechnungen } from '../../db/schema';
import { rechnungBundleHandler } from '../../http/bundleRoute';
import { createTestDb, type TestDb } from '../helpers/testDb';

async function seedAg(ctx: TestDb): Promise<number> {
  const [a] = ctx.db
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
  return a!.id;
}

async function seedKindAndRechnung(
  ctx: TestDb,
  agId: number,
  nummer: string,
  year: number,
  month: number,
  dateiname: string,
): Promise<number> {
  const [k] = ctx.db
    .insert(kinder)
    .values({
      vorname: nummer,
      nachname: 'Test',
      geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
      strasse: 'S',
      hausnummer: '1',
      plz: '50667',
      stadt: 'Köln',
      aktenzeichen: `K-${nummer}`,
    })
    .returning()
    .all();
  ctx.db
    .insert(rechnungen)
    .values({
      nummer,
      jahr: year,
      monat: month,
      kindId: k!.id,
      auftraggeberId: agId,
      stundensatzCentsSnapshot: 4500,
      gesamtCents: 9000,
      dateiname,
    })
    .run();
  // minimal pdf on disk
  writeFileSync(join(ctx.paths.billsDir, dateiname), Buffer.from('%PDF-1.4\n%stub\n'));
  return k!.id;
}

describe('rechnungBundleHandler (PRD §3.8)', () => {
  let ctx: TestDb;
  beforeEach(() => {
    ctx = createTestDb();
  });
  afterEach(() => {
    ctx.cleanup();
  });

  it('returns 400 when required query params are missing', async () => {
    const res = await rechnungBundleHandler(
      new URL('http://localhost/bills/bundle'),
      ctx.db,
      ctx.paths,
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when no Rechnungen exist for the given month', async () => {
    const agId = await seedAg(ctx);
    const res = await rechnungBundleHandler(
      new URL(`http://localhost/bills/bundle?auftraggeberId=${agId}&jahr=2026&monat=4`),
      ctx.db,
      ctx.paths,
    );
    expect(res.status).toBe(404);
  });

  it('bundles all Rechnungen for the given auftraggeber+month into a ZIP', async () => {
    const agId = await seedAg(ctx);
    await seedKindAndRechnung(ctx, agId, 'RE-2026-04-0001', 2026, 4, 'RE-2026-04-0001-Anna.pdf');
    await seedKindAndRechnung(ctx, agId, 'RE-2026-04-0002', 2026, 4, 'RE-2026-04-0002-Ben.pdf');
    // A different month should not be included.
    await seedKindAndRechnung(ctx, agId, 'RE-2026-05-0003', 2026, 5, 'RE-2026-05-0003-Anna.pdf');

    const res = await rechnungBundleHandler(
      new URL(`http://localhost/bills/bundle?auftraggeberId=${agId}&jahr=2026&monat=4`),
      ctx.db,
      ctx.paths,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toContain('RE-2026-04-Jugendamt_Koeln.zip');

    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(['RE-2026-04-0001-Anna.pdf', 'RE-2026-04-0002-Ben.pdf']);
  });
});
