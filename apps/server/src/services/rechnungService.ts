import {
  computeRechnungsLines,
  sanitizeKindesname,
  sumZeilenbetraege,
  TAETIGKEIT_LABELS,
  type TaetigkeitValue,
  type TherapieFormValue,
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
import { allocateOrUseNummer } from './nummer';
import { resolveTemplate } from './templateResolver';

export { RechnungsnummerDuplicateError } from './nummer';

export class RechnungExistiertError extends Error {
  constructor(year: number, month: number, kindId: number, auftraggeberId: number) {
    super(
      `Für Jahr ${year}, Monat ${month}, Kind ${kindId}, Auftraggeber ${auftraggeberId} existiert bereits eine Rechnung`,
    );
    this.name = 'RechnungExistiertError';
  }
}

export class KeineTherapieError extends Error {
  constructor(kindId: number, auftraggeberId: number) {
    super(
      `Für Kind ${kindId} beim Auftraggeber ${auftraggeberId} ist keine Therapie angelegt — bitte zuerst eine Therapie erfassen.`,
    );
    this.name = 'KeineTherapieError';
  }
}

export interface CreateRechnungInput {
  year: number;
  month: number;
  kindId: number;
  auftraggeberId: number;
  /**
   * Ausstellungsdatum der Rechnung. Wird vom Nutzer beim Erzeugen
   * gesetzt (Default heute) und separat von `createdAt` gespeichert,
   * damit die Rechnung auch später noch mit einem anderen Datum
   * neu erzeugt werden kann.
   */
  rechnungsdatum: Date;
  /**
   * Wenn true, überschreibt eine bereits existierende Rechnung (gleicher
   * Monat/Kind/Auftraggeber) unter Beibehaltung der Rechnungsnummer (§4).
   * Die Datei wird neu erzeugt, `downloadedAt` wird zurückgesetzt.
   */
  force?: boolean;
  /**
   * Optional vom Nutzer gewählte laufende Nummer (NNNN, 1..9999). Nur die
   * NNNN ist im Dialog editierbar; der Präfix `RE-YYYY-MM-` wird hier auf
   * Basis von `year`/`month` gesetzt. Wenn nicht gesetzt, ermittelt der
   * Service `max+1` im Jahr (PRD §4).
   *
   * **Wichtig**: Bei `force === true` (Korrektur) wird dieser Wert
   * ignoriert — die ursprüngliche Nummer bleibt unverändert (PRD §4).
   */
  lfdNummer?: number;
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
  const existingRow = existing[0] ?? null;
  if (existingRow && !input.force) {
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

  // Therapieform für den Einleitungstext des PDFs. Pro (Kind, Auftraggeber)
  // existiert genau eine Therapie (PRD §2.3); fehlt sie, ist die Rechnung
  // nicht sinnvoll erzeugbar.
  const [therapie] = db
    .select()
    .from(therapienTbl)
    .where(
      and(
        eq(therapienTbl.kindId, input.kindId),
        eq(therapienTbl.auftraggeberId, input.auftraggeberId),
      ),
    )
    .all();
  if (!therapie) throw new KeineTherapieError(input.kindId, input.auftraggeberId);

  const behandlungenRows = collectBehandlungen(db, input);

  const lines = computeRechnungsLines(
    behandlungenRows.map((b) => ({ be: b.be })),
    ag.stundensatzCents,
  );
  const gesamtCents = sumZeilenbetraege(lines);

  // PRD §4: Bei force=true behalten wir die bestehende Nummer; ein vom
  // Nutzer übergebenes `lfdNummer` wird in diesem Fall bewusst ignoriert
  // (siehe Doc-Kommentar an `CreateRechnungInput.lfdNummer`).
  // Sonst wird neu allokiert — entweder mit der vom Nutzer gewählten NNNN
  // oder als max+1 für das Jahr.
  const nummer = existingRow
    ? existingRow.nummer
    : allocateOrUseNummer(db, input.year, input.month, input.lfdNummer);
  const dateiname = `${nummer}-${sanitizeKindesname(kind.vorname, kind.nachname)}.pdf`;

  // Resolve template (per-Auftraggeber → global fallback).
  const templatePath = resolveTemplate(db, paths, 'rechnung', input.auftraggeberId);
  const templateBytes = new Uint8Array(readFileSync(templatePath));

  const pdfInput: RechnungPdfInput = {
    templateBytes,
    nummer,
    rechnungsdatum: input.rechnungsdatum,
    year: input.year,
    month: input.month,
    kind: {
      vorname: kind.vorname,
      nachname: kind.nachname,
      aktenzeichen: kind.aktenzeichen,
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
    therapieForm: therapie.form as TherapieFormValue,
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
  if (existingRow) {
    // PRD §3.2 Korrektur: bestehende Rechnung mit korrigierten Daten
    // überschreiben. Snapshots werden vorher gelöscht und neu gesetzt.
    // downloadedAt wird zurückgesetzt (neu erzeugte Version wurde noch
    // nicht versendet).
    db.delete(rechnungBehandlungen)
      .where(eq(rechnungBehandlungen.rechnungId, existingRow.id))
      .run();
    const [row] = db
      .update(rechnungen)
      .set({
        stundensatzCentsSnapshot: ag.stundensatzCents,
        gesamtCents,
        rechnungsdatum: input.rechnungsdatum,
        dateiname,
        downloadedAt: null,
      })
      .where(eq(rechnungen.id, existingRow.id))
      .returning()
      .all();
    if (!row) throw new Error('Unerwartete Datenbank-Antwort beim Aktualisieren der Rechnung');
    inserted = row;
  } else {
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
          rechnungsdatum: input.rechnungsdatum,
          dateiname,
        })
        .returning()
        .all();
      if (!row) throw new Error('Unerwartete Datenbank-Antwort beim Anlegen der Rechnung');
      inserted = row;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new RechnungExistiertError(
          input.year,
          input.month,
          input.kindId,
          input.auftraggeberId,
        );
      }
      throw err;
    }
  }

  // Per-line snapshots (frisch für alle Rechnungen — bei force=true nach
  // vorherigem Löschen).
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
