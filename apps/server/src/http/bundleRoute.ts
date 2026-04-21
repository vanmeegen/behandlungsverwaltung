import { and, eq } from 'drizzle-orm';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Db } from '../db/client';
import { auftraggeber as auftraggeberTbl, rechnungen } from '../db/schema';
import type { Paths } from '../paths';

function sanitizeSlug(raw: string): string {
  return raw
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function auftraggeberSlug(ag: {
  typ: 'firma' | 'person';
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
}): string {
  const source =
    ag.typ === 'firma'
      ? (ag.firmenname ?? 'Auftraggeber')
      : `${ag.nachname ?? ''}_${ag.vorname ?? ''}`;
  const slug = sanitizeSlug(source);
  return slug.length > 0 ? slug : 'Auftraggeber';
}

// PRD §3.8: Liefert ein ZIP mit allen Rechnungen eines Auftraggebers für
// einen Monat. URL: /bills/bundle?auftraggeberId=ID&jahr=YYYY&monat=MM
export async function rechnungBundleHandler(url: URL, db: Db, paths: Paths): Promise<Response> {
  const auftraggeberIdParam = url.searchParams.get('auftraggeberId');
  const jahrParam = url.searchParams.get('jahr');
  const monatParam = url.searchParams.get('monat');
  const auftraggeberId = auftraggeberIdParam ? Number(auftraggeberIdParam) : NaN;
  const jahr = jahrParam ? Number(jahrParam) : NaN;
  const monat = monatParam ? Number(monatParam) : NaN;
  if (!Number.isInteger(auftraggeberId) || !Number.isInteger(jahr) || !Number.isInteger(monat)) {
    return new Response('auftraggeberId, jahr, monat sind Pflicht', { status: 400 });
  }

  const [ag] = db
    .select()
    .from(auftraggeberTbl)
    .where(eq(auftraggeberTbl.id, auftraggeberId))
    .all();
  if (!ag) return new Response('Auftraggeber nicht gefunden', { status: 404 });

  const rows = db
    .select()
    .from(rechnungen)
    .where(
      and(
        eq(rechnungen.auftraggeberId, auftraggeberId),
        eq(rechnungen.jahr, jahr),
        eq(rechnungen.monat, monat),
      ),
    )
    .all();
  if (rows.length === 0) {
    return new Response('Keine Rechnungen für diesen Auftraggeber und Monat', { status: 404 });
  }

  const zip = new JSZip();
  for (const r of rows) {
    const pdfPath = join(paths.billsDir, r.dateiname);
    const bytes = await readFile(pdfPath);
    zip.file(r.dateiname, bytes);
  }
  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  const bundleName = `RE-${jahr}-${String(monat).padStart(2, '0')}-${auftraggeberSlug(ag)}.zip`;
  return new Response(buffer, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${bundleName}"`,
    },
  });
}
