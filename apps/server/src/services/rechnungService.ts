import {
  computeRechnungsLines,
  sanitizeKindesname,
  sumZeilenbetraege,
  TAETIGKEIT_LABELS,
  type TaetigkeitValue,
} from '@behandlungsverwaltung/shared';
import { and, eq } from 'drizzle-orm';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../db/client';
import {
  auftraggeber as auftraggeberTbl,
  behandlungen as behandlungenTbl,
  kinder as kinderTbl,
  rechnungBehandlungen,
  rechnungen,
  therapien as therapienTbl,
  type Rechnung,
} from '../db/schema';
import type { Paths } from '../paths';
import { renderRechnungPdf, type RechnungPdfInput } from '../pdf/rechnungPdf';
import { collectBehandlungen } from './rechnungAggregation';
import { allocateNummer } from './nummer';
import { resolveTemplate } from './templateResolver';

export class RechnungExistiertError extends Error {
  constructor(year: number, month: number, kindId: number, auftraggeberId: number) {
    super(
      `Für Jahr ${year}, Monat ${month}, Kind ${kindId}, Auftraggeber ${auftraggeberId} existiert bereits eine Rechnung`,
    );
    this.name = 'RechnungExistiertError';
  }
}

export interface CreateRechnungInput {
  year: number;
  month: number;
  kindId: number;
  auftraggeberId: number;
}

function isUniqueViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('UNIQUE constraint failed');
}

export async function createMonatsrechnung(
  db: Db,
  paths: Paths,
  input: CreateRechnungInput,
): Promise<Rechnung> {
  // Pre-check: allows us to surface the duplicate before doing expensive work.
  const existing = db
    .select()
    .from(rechnungen)
    .where(
      and(
        eq(rechnungen.jahr, input.year),
        eq(rechnungen.monat, input.month),
        eq(rechnungen.kindId, input.kindId),
        eq(rechnungen.auftraggeberId, input.auftraggeberId),
      ),
    )
    .all();
  if (existing.length > 0) {
    throw new RechnungExistiertError(input.year, input.month, input.kindId, input.auftraggeberId);
  }

  const [kind] = db.select().from(kinderTbl).where(eq(kinderTbl.id, input.kindId)).all();
  if (!kind) throw new Error(`Kind ${input.kindId} nicht gefunden`);
  const [ag] = db
    .select()
    .from(auftraggeberTbl)
    .where(eq(auftraggeberTbl.id, input.auftraggeberId))
    .all();
  if (!ag) throw new Error(`Auftraggeber ${input.auftraggeberId} nicht gefunden`);

  const behandlungenRows = collectBehandlungen(db, input);

  const lines = computeRechnungsLines(
    behandlungenRows.map((b) => ({ be: b.be })),
    ag.stundensatzCents,
  );
  const gesamtCents = sumZeilenbetraege(lines);

  const nummer = allocateNummer(db, input.year, input.month);
  const dateiname = `${nummer}-${sanitizeKindesname(kind.vorname, kind.nachname)}.pdf`;

  // Resolve template (per-Auftraggeber → global fallback).
  const templatePath = resolveTemplate(db, paths, 'rechnung', input.auftraggeberId);
  const templateBytes = new Uint8Array(readFileSync(templatePath));

  const pdfInput: RechnungPdfInput = {
    templateBytes,
    nummer,
    year: input.year,
    month: input.month,
    kind: {
      vorname: kind.vorname,
      nachname: kind.nachname,
      strasse: kind.strasse,
      hausnummer: kind.hausnummer,
      plz: kind.plz,
      stadt: kind.stadt,
    },
    auftraggeber: {
      typ: ag.typ,
      firmenname: ag.firmenname,
      vorname: ag.vorname,
      nachname: ag.nachname,
      strasse: ag.strasse,
      hausnummer: ag.hausnummer,
      plz: ag.plz,
      stadt: ag.stadt,
    },
    stundensatzCents: ag.stundensatzCents,
    lines: behandlungenRows.map((b, i) => ({
      datum: b.datum,
      taetigkeit: b.taetigkeit,
      taetigkeitLabel: b.taetigkeit
        ? (TAETIGKEIT_LABELS[b.taetigkeit as TaetigkeitValue] ?? b.taetigkeit)
        : null,
      be: b.be,
      zeilenbetragCents: lines[i]!.zeilenbetragCents,
    })),
    gesamtCents,
  };
  const pdfBytes = await renderRechnungPdf(pdfInput);
  writeFileSync(join(paths.billsDir, dateiname), pdfBytes);

  let inserted: Rechnung;
  try {
    const [row] = db
      .insert(rechnungen)
      .values({
        nummer,
        jahr: input.year,
        monat: input.month,
        kindId: input.kindId,
        auftraggeberId: input.auftraggeberId,
        stundensatzCentsSnapshot: ag.stundensatzCents,
        gesamtCents,
        dateiname,
      })
      .returning()
      .all();
    if (!row) throw new Error('Unerwartete Datenbank-Antwort beim Anlegen der Rechnung');
    inserted = row;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new RechnungExistiertError(input.year, input.month, input.kindId, input.auftraggeberId);
    }
    throw err;
  }

  // Per-line snapshots.
  for (let i = 0; i < behandlungenRows.length; i++) {
    const b = behandlungenRows[i]!;
    db.insert(rechnungBehandlungen)
      .values({
        rechnungId: inserted.id,
        behandlungId: b.id,
        snapshotDate: b.datum,
        snapshotBe: b.be,
        snapshotTaetigkeit: b.taetigkeit,
        snapshotZeilenbetragCents: lines[i]!.zeilenbetragCents,
      })
      .run();
  }

  // Explicit reference (linter): behandlungenTbl and therapienTbl are used
  // transitively through collectBehandlungen.
  void behandlungenTbl;
  void therapienTbl;

  return inserted;
}
