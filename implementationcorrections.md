# Implementation Plan — PRDcorrections → Anwendung

## Kontext

Die PRD-Korrekturen aus `PRDcorrections.md` sind in `PRD.md`
eingearbeitet. Dieses Dokument bildet sie als **konkrete
Code-Änderungen** ab — Pendant zu `PRDcorrections.md` und
Arbeitsgrundlage für die Umsetzung.

**Stack (bestätigt):** Bun-Workspace · Drizzle ORM · Pothos
GraphQL-Builder · React + MUI + MobX + Zod · pdf-lib für
PDF-Generierung · Vitest + Playwright.

**Quelle der Wahrheit für Enums:** `packages/shared/src/validation/*` —
von Server (GraphQL-Enum) und Web (MobX-Stores + UI) importiert.

## Nicht im Umfang dieser Umsetzung

- **§5 PDF-Vorlagen** — Abschnitt ist im PRD als „wird separat
  überarbeitet" markiert (AcroForm vs. DOCX→LibreOffice vs.
  HTML→Chromium vs. pdfme). Separate Diskussion + Spike
  **vor** Umsetzung.

---

## Milestones

Jeder Milestone ist für sich **buildbar, testbar und mergeable**.
Reihenfolge ist so gewählt, dass jeder Milestone auf den vorigen
aufbaut (M1 = Fundament; CRUD-Erweiterungen in M8).

### M1 — Schema- und Enum-Fundament

**Ziel:** Alle neuen Stamm-Werte und Spalten sind im Schema vorhanden.
Keine UI-Verhaltensänderung.

**Änderungen:**

- `packages/shared/src/validation/therapie.ts` — `THERAPIE_FORM_VALUES`
  um `lrs-therapie` und `resilienztraining` erweitern.
- **Neu:** `packages/shared/src/validation/taetigkeit.ts` mit
  `TAETIGKEIT_VALUES = [...THERAPIE_FORM_VALUES,
'elterngespraech', 'lehrergespraech', 'bericht', 'foerderplan',
'teamberatung'] as const` und Zod-Schema. Gemeinsames Label-Mapping
  zentral in einer neuen `packages/shared/src/labels/therapie.ts` (zieht
  die heute in `TherapieForm.tsx` Z25–31 und `TherapieList.tsx` Z16–22
  **duplizierten** Labels in eine Datei).
- `apps/server/src/db/schema/therapien.ts` — `THERAPIE_FORM` um die
  zwei Werte erweitern.
- `apps/server/src/db/schema/rechnungen.ts` — neue Spalte
  `downloadedAt: timestamp('downloaded_at', ...)` (nullable) für
  UC-3.8.
- `apps/server/src/schema/types/enums.ts` — `TherapieFormEnum`
  erweitern, **neu:** `TaetigkeitEnum` (builder.enumType aus
  `TAETIGKEIT_VALUES`).
- `apps/server/drizzle/` — neue Migration erzeugen
  (`bun --filter=server run db:generate`). Migration enthält:
  1. Erweiterung des `THERAPIE_FORM` Check-Constraints
  2. Neue Spalte `downloaded_at` auf `rechnungen`

**Verifikation M1:** Build grün (`bun run --filter='*' build`), Typecheck
grün, bestehende Tests grün. Neue Enum-Werte erscheinen im
GraphQL-Schema-Introspection.

---

### M2 — Rechnungsnummer-Format `RE-YYYY-MM-NNNN` + Dateiname-Präfixe

**Ziel:** Alle neu erzeugten Rechnungsnummern und Dateinamen tragen
`RE-`/`ST-` Präfixe.

**Änderungen:**

- `packages/shared/src/domain/rechnungsnummer.ts` —
  - Regex `^(\d{4})-(\d{2})-(\d{4})$` → `^RE-(\d{4})-(\d{2})-(\d{4})$`
  - `formatRechnungsnummer()` Output mit `RE-` präfixen
  - `parseRechnungsnummer()` akzeptiert den Präfix
- `packages/shared/src/__tests__/rechnungsnummer.spec.ts` — alle
  String-Assertions (`'2026-04-0001'` usw.) auf `'RE-…'` anheben.
- `apps/server/src/services/rechnungService.ts` Z85–86 — da
  `nummer` nun `RE-…` ist, ergibt `${nummer}-${sanitizeKindesname(...)}.pdf`
  automatisch `RE-2026-04-0001-Anna_Musterfrau.pdf`. **Keine
  Code-Änderung nötig** — nur Tests aktualisieren.
- `apps/server/src/services/stundennachweisService.ts` Z84–91 —
  Dateiname bisher aus `rechnung.nummer` abgeleitet.
  **Neu:** `rechnung.nummer.replace(/^RE-/, 'ST-')` für den Dateinamen
  (Rechnungsnummer selbst bleibt `RE-…`, §4).
- `apps/server/src/__tests__/pdf/rechnungPdf.spec.ts` +
  `services/rechnungService.spec.ts` — Nummer-Assertions angleichen.
- E2E-Specs: `uc-3.2-rechnung.e2e.ts`, `uc-3.3-stundennachweis.e2e.ts`,
  `uc-3.4-rechnungsuebersicht.e2e.ts` — Rechnungsnummern/Dateinamen.

**Verifikation M2:** `bun run --filter='shared' test` grün (Unit),
E2E-Suite grün mit neuen Assertions; manuell: eine Rechnung erzeugen,
Datei im `bills/`-Ordner prüfen.

---

### M3 — `arbeitsthema` → `tätigkeit` (Rename + Typ string → Enum)

**Ziel:** Therapie und Behandlung tragen ein Enum-Feld `taetigkeit`
statt eines freien Textfelds `arbeitsthema`. Vorbelegung von Therapie
auf Behandlung bleibt erhalten; in Behandlung wird das Feld Pflicht.

**Schema + Migration (kritischer Pfad — Daten-Migration):**

- `apps/server/src/db/schema/therapien.ts` Z25 — `arbeitsthema` →
  `taetigkeit` (enum, nullable).
- `apps/server/src/db/schema/behandlungen.ts` Z11 — `arbeitsthema` →
  `taetigkeit` (enum, **not null**; Default = Therapie-Tätigkeit, siehe
  Mutation).
- `apps/server/src/db/schema/rechnungBehandlungen.ts` Z15 —
  `snapshotArbeitsthema` → `snapshotTaetigkeit`.
- **Drizzle-Migration** (manuell nachziehen, da ein Datentyp-Wechsel
  erfolgt):
  1. Freitext-Werte auf Enum-Werte mappen (SQL `CASE WHEN` — alle
     nicht-leeren Einträge auf `'sonstiges'` mappen, leere auf NULL
     bzw. bei Behandlung auf Therapie-Tätigkeit).
  2. Column-Rename + Type-Change + Constraint.
  3. Annahme: Datenbank ist lokal/einzelplatz — migration-script
     idempotent + mit `-- NOTE` versehen. **Vor** Merge einmal gegen
     ein Backup der lokalen DB trockenlaufen lassen.

**Shared/Validation:**

- `packages/shared/src/validation/therapie.ts` Z17–24 — `arbeitsthema:
z.string().optional()` → `taetigkeit: TaetigkeitSchema.nullable()`.
- `packages/shared/src/validation/behandlung.ts` Z16–23 — `taetigkeit:
TaetigkeitSchema` (Pflicht).

**Server/GraphQL:**

- `apps/server/src/schema/types/therapie.ts` Z13,
  `behandlung.ts` Z10 — Field umbenennen, Typ auf `TaetigkeitEnum`.
- `apps/server/src/schema/types/therapieInput.ts` Z11,
  `behandlungInput.ts` Z8 — Inputs angleichen.
- `apps/server/src/schema/mutations/therapie.ts` Z26 — `toRowValues()`.
- `apps/server/src/schema/mutations/behandlung.ts` Z30, Z38 — Fallback
  auf `therapie.taetigkeit` bleibt; Pflichtfeld-Fallback gegen
  Validation sichern.
- `apps/server/src/services/rechnungService.ts` Z86, Z118–121, Z161 —
  Snapshot-Feld durchziehen.
- `apps/server/src/pdf/rechnungPdf.ts` Z7 (`RechnungPdfLine`) —
  Interface-Feld umbenennen (wird in M4 ohnehin angefasst).

**Web:**

- `apps/web/src/components/TherapieForm.tsx` Z169–174 — TextField →
  `<Select>` mit `TAETIGKEIT_VALUES` (optional/nullable).
- `apps/web/src/pages/SchnellerfassungPage.tsx` Z149–154 — TextField
  → Select (Pflicht, vorbelegt aus Therapie, überschreibbar). Label:
  **„Tätigkeit"**.
- `apps/web/src/models/TherapieStore.ts` Z92, Z114–116 und
  `BehandlungStore.ts` Z61, Z76–86 — Draft-Felder und Reset-Logik
  umstellen.
- `apps/web/src/components/TherapieList.tsx` — Anzeige-Feld (wird bei
  UC-3.9 eh angefasst).
- Shared Label-Mapping aus M1 in Therapie/Behandlung-Anzeige nutzen.

**Tests:**

- `apps/web/e2e/helpers/seed.ts` Z127, Z137, Z160, Z168 — Seed-Helper
  akzeptieren `taetigkeit` statt `arbeitsthema`.
- Alle E2E-Specs mit „Arbeitsthema"-Wording auf „Tätigkeit" umstellen
  (PRD-Gherkins sind bereits korrekt).
- **Neu:** Unit-Test in `packages/shared/src/__tests__/taetigkeit.spec.ts`
  — Werte-Liste enthält alle Therapieformen (inkl. M1-Neuerungen) +
  5 Fachgespräche.

**Verifikation M3:** Workspace-Build grün, Typecheck grün, alle
bestehenden Tests grün, Form-Screens zeigen Dropdown mit den 12 Werten,
Schnellerfassung übernimmt die Therapie-Tätigkeit korrekt.

---

### M4 — Rechnungszeilen: Spalten `Bezeichnung · Menge · Einheit · Einzel · Gesamt`

**Ziel:** Rechnungs-PDF rendert die neue Spaltenfolge; Datum entfällt
aus der Zeile.

**Änderungen:**

- `apps/server/src/pdf/layout.ts` Z16–18 — Spalten-Konstanten
  ersetzen:
  - `colBezeichnungX` (ersetzt `colArbeitsthemaX`)
  - **neu:** `colMengeX`, `colEinheitX`
  - `colEinzelX`, `colGesamtX`
  - `colDatumX` **entfernt** (PRD §3.2 — Rechnungszeile enthält kein
    Datum mehr).
- `apps/server/src/pdf/rechnungPdf.ts` Z131–155 (Header) und Z159–191
  (Body-Loop) —
  - Header-Texte: „Bezeichnung · Menge · Einheit · Einzel € · Gesamt €"
  - Zeilen-Inhalt:
    `Bezeichnung = line.taetigkeit` (gelabelt),
    `Menge = line.be`, `Einheit = 'BE'`,
    `Einzel = line.stundensatzCents`, `Gesamt = line.zeilenbetragCents`.
  - `RechnungPdfLine` (Z5–10) erhält Feld `taetigkeit` (aus M3),
    verliert `datum`.
- `apps/server/src/services/rechnungService.ts` — Zeilen-Aggregation
  gibt `taetigkeit` statt `arbeitsthema` und **kein** `datum` mehr an
  den Renderer weiter.

**Tests:**

- `apps/server/src/__tests__/pdf/rechnungPdf.spec.ts` — Spalten-Header
  prüfen, Datum **nicht mehr** in der Zeilenzone.
- AC-RECH-10 (PRD §9) decken Spaltenreihenfolge als Unit-Test;
  zusätzlich ein UI-Assertions in `uc-3.2-rechnung.e2e.ts` auf die
  Spalten-Header (schon in den neuen Gherkin-Szenarien enthalten).

**Verifikation M4:** Generiertes PDF manuell inspizieren (Spalten +
Einheit „BE"); Unit-Tests grün.

---

### M5 — Duplikat-Dialog mit „Ja / Abbrechen" + Korrektur-Flow

**Ziel:** Wiederkehrende Rechnung für denselben Monat/Kind/Auftraggeber
startet einen **bestätigten** Überschreib-Flow. Rechnungsnummer bleibt.

**Änderungen:**

- **Neu:** `apps/web/src/components/ConfirmDialog.tsx` —
  wiederverwendbar, MUI-Dialog, Props `open`, `title`, `message`,
  `confirmLabel='Ja'`, `cancelLabel='Abbrechen'`, `onConfirm`,
  `onCancel`, `data-testselector`-Prop. Wird auch in M8 für alle
  Delete-Dialoge genutzt.
- `apps/server/src/schema/types/rechnungInput.ts` — Input um
  `force: boolean = false` erweitern.
- `apps/server/src/schema/mutations/rechnung.ts` und
  `services/rechnungService.ts` — bei `force=true` bestehende
  Rechnungs-Datensätze + Datei **überschreiben**; Rechnungsnummer
  **bleibt unverändert**; `downloadedAt` wird auf `null` zurückgesetzt
  (neu erzeugte Version wurde noch nicht versendet).
- `apps/web/src/pages/RechnungCreatePage.tsx` Z129–148 — bestehenden
  Duplikat-Dialog durch `ConfirmDialog` ersetzen: Title „Für diesen
  Monat wurde bereits eine Rechnung erzeugt — neu erzeugen?", Buttons
  „Ja"/„Abbrechen"; bei „Ja" erneuter `createMonatsrechnung`-Call
  mit `force: true`.
- `apps/web/src/models/RechnungStore.ts` Z37–48 — `saveDraft()`
  akzeptiert optional `{ force }`; Error-Code `DUPLICATE_RECHNUNG`
  triggert den Dialog statt generischem Error.

**Tests:**

- AC-RECH-05 + AC-RECH-11 (Ja/Abbrechen + Korrektur-Flow) — bereits
  als Gherkins in UC-3.2 vorhanden; E2E-Spec `uc-3.2-rechnung.e2e.ts`
  um beide Szenarien erweitern.
- Server-Test: `force=true` ersetzt Datei, `nummer` bleibt;
  `downloadedAt` ist `null`.

**Verifikation M5:** Zweifach ausgelöste Rechnung zeigt Dialog;
„Abbrechen" lässt alles stehen, „Ja" überschreibt die PDF-Datei und
behält die Nummer.

---

### M6 — Schnellerfassung: mehrere Behandlungen in Folge

**Ziel:** Nach „Speichern" bleibt die Maske offen, Kind/Therapie bleiben
ausgewählt, Datum/BE zurückgesetzt — Tätigkeit wieder aus Therapie
vorbelegt.

**Änderungen:**

- `apps/web/src/models/BehandlungStore.ts` Z104–112 — `reset()`
  beibehalten (Full-Reset), **neu:** Methode `resetForNextEntry()`:
  `kindId`/`therapieId` bleiben stehen; `datum = todayIso()`; `be = 1`;
  `taetigkeit` wird aus der gewählten Therapie neu vorbelegt.
- `apps/web/src/pages/SchnellerfassungPage.tsx` Z53–60 — nach Erfolg
  **nicht mehr** auf `/` navigieren; stattdessen
  `draft.resetForNextEntry()`, Success-Snackbar „Behandlung
  gespeichert" anzeigen, Focus zurück auf das BE-Stepper-Feld.
- Bestehendes „Speichern & Zurück"-Verhalten bleibt als sekundäre
  Aktion erhalten (z. B. per „Fertig"-Button), damit die Therapeutin
  die Seite bewusst verlassen kann.

**Tests:**

- `uc-3.1-schnellerfassung.e2e.ts` um das Szenario „Mehrere Behandlungen
  in Folge" (PRD-Gherkin bereits vorhanden) erweitern.
- AC-BEH-05 deckt das Verhalten als e2e.

**Verifikation M6:** Zwei aufeinanderfolgende Speichern-Taps erzeugen
zwei Behandlungen, ohne dass Kind/Therapie erneut gewählt werden müssen.

---

### M7 — UC-3.8 Rechnungen pro Auftraggeber & Monat herunterladen

**Ziel:** Therapeutin wählt Auftraggeber + Monat, lädt alle Rechnungen
als ZIP, System markiert sie als „heruntergeladen am".

**Änderungen:**

- **Neu:** Route + Page
  `apps/web/src/pages/RechnungDownloadPage.tsx` — Filter (Auftraggeber,
  Monat), Liste der betreffenden Rechnungen, Button „Rechnungen
  herunterladen".
- `apps/web/src/components/AppShell.tsx` Z26–36 — neuer Nav-Eintrag
  „Rechnungen herunterladen" (unter dem Rechnungen-Menü).
- `apps/server/src/schema/queries/rechnung.ts` — Query
  `rechnungenByAuftraggeberMonat(auftraggeberId, year, month)` (falls
  noch nicht vorhanden — Filter existiert bereits im Frontend der
  Rechnungsübersicht, Server-Query ggf. ergänzen).
- `apps/server/src/schema/mutations/rechnung.ts` — neue Mutation
  `markRechnungenDownloaded(ids: [ID!]!)` → setzt `downloadedAt = now()`.
- **Download-Endpoint** (server): neue Route `/bills/bundle?auftraggeber=&jahr=&monat=`
  (oder GraphQL-Mutation mit Signed-URL) — sammelt die PDFs,
  verpackt als ZIP, Dateiname `RE-YYYY-MM-<Auftraggeber-slug>.zip`.
  Implementierung mit `archiver` (Node-ZIP-Standard, keine neuen
  Compile-Schritte).
- `apps/web/src/models/RechnungStore.ts` — `downloadBundle()`
  triggert den Download + anschließend `markRechnungenDownloaded(...)`.
- `apps/web/src/pages/RechnungListPage.tsx` Z136–144 — neue Spalte
  „heruntergeladen am" (formatiert), sichtbar in der Übersicht.

**Tests:**

- **Neu:** `uc-3.8-rechnungen-download.e2e.ts` — Gherkin aus PRD
  umsetzen (ZIP enthält beide April-Dateien, Mai-Rechnung bleibt
  unmarkiert). Seed-Helfer nutzt bereits vorhandenes
  `createMonatsrechnungApi()`.
- Server-Unit-Test: `markRechnungenDownloaded` idempotent, Bulk-Update.

**Verifikation M7:** UC-Flow im Browser: Download startet, ZIP enthält
erwartete Dateien, Übersicht zeigt „heruntergeladen am".

---

### M8 — CRUD Update/Delete für alle Entitäten

**Ziel:** Die im PRD §10 (CRUD-Entity → E2E Mapping) benannten
Update/Delete-Flows sind produktiv und durch E2E-Tests gedeckt.

**Server — fehlende Mutations:**

- `apps/server/src/schema/mutations/kind.ts` — `deleteKind(id)`
  (Referenz-Check: keine Therapie dranhängt).
- `apps/server/src/schema/mutations/auftraggeber.ts` —
  `updateAuftraggeber(id, input)` **und** `deleteAuftraggeber(id)`
  (Referenz-Check: keine Therapie).
- `apps/server/src/schema/mutations/therapie.ts` — **Update existiert**;
  neu: `deleteTherapie(id)` (Referenz-Check: keine Behandlung).
- `apps/server/src/schema/mutations/behandlung.ts` —
  `updateBehandlung(id, input)` und `deleteBehandlung(id)`.
- `apps/server/src/schema/mutations/template.ts` —
  `deleteTemplate(auftraggeberId, kind)` (löscht Datei, Fallback greift
  wieder).
- Einheitlicher Fehler-Code `REFERENCED_BY_CHILD` mit `code` + `entity`
  - `childCount` — vom UI als deutsche Meldung ausgegeben.

**Web — Listen-Actions + Dialoge:**

- Alle Listen-Pages (`KindList`, `AuftraggeberList`, `TherapieList`,
  neue Behandlungs-Liste unter Therapie-Detail) erhalten pro Zeile
  „Löschen" neben „Bearbeiten". Löschen öffnet `ConfirmDialog` (aus
  M5). Vorlagen-UI (`TemplateUploadPage`) erhält Liste + „Entfernen".
- **Neu für Behandlung-Update:** Bisher existiert nur Schnellerfassung.
  Option: Detail-Ansicht der Therapie zeigt Behandlungsliste mit
  „Bearbeiten/Löschen" je Zeile (wiederverwendbares Form auf Basis
  der Schnellerfassung).
- Für Auftraggeber-Update existiert bereits die Edit-Route — Mutation
  fehlt lediglich im Backend (Server-Mutation fehlt laut Explore).

**Tests (E2E):**

- `uc-3.5-kind.e2e.ts` — „Kind löschen" + Referenz-Schutz-Szenario.
- `uc-3.6-auftraggeber.e2e.ts` — Bearbeiten (Stundensatz),
  Löschen + Referenz-Schutz.
- `uc-3.7-therapie.e2e.ts` — Bearbeiten (BE, Tätigkeit), Löschen +
  Referenz-Schutz.
- **Neu:** `uc-3.9-behandlung-bearbeiten-loeschen.e2e.ts` — PRD-Gherkin
  umsetzen (inkl. Abbrechen-Pfad).
- **Neu:** `uc-3.10-template-delete.e2e.ts` — PRD-Gherkin umsetzen
  (Fallback greift nach Entfernen wieder).

**Page Objects erweitern:** `delete(id)`-Methoden in
`KindListPage`, `AuftraggeberListPage`, `TherapieListPage`, neu
`BehandlungListPage`; Selektoren konsistent (`…-row-<id>-delete`).

**Verifikation M8:** `bun run --filter='*' test` grün, Playwright-Suite
grün, manuelle Smoke-Tests pro Entity (Delete + Referenz-Schutz-Fall).

---

## Parallel-Arbeit / Abhängigkeiten

```
M1 ─► M2 ─► M4
  └─► M3 ─► M4 ─► M5 ─► M6
            └──► M7
            └──► M8
```

- **M4** wartet auf **M3** (Tätigkeit-Feld in `RechnungPdfLine`).
- **M5** setzt **M1** (downloadedAt-Rücksetzung) voraus.
- **M7** setzt **M1** (downloadedAt-Spalte) voraus.
- **M8** hängt nicht an **M5/M6/M7**; der `ConfirmDialog` aus **M5**
  wird wiederverwendet — wenn M8 vor M5 startet, den Dialog in M5
  heben (oder vorziehen).

## Kritische Dateien (Schnellreferenz)

| Bereich                                     | Datei                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Shared Enum (Therapieform/Tätigkeit/Labels) | `packages/shared/src/validation/therapie.ts`, `…/validation/taetigkeit.ts` (neu), `…/labels/therapie.ts` (neu)   |
| Rechnungsnummer                             | `packages/shared/src/domain/rechnungsnummer.ts`                                                                  |
| Dateinamen                                  | `packages/shared/src/format/filename.ts`, `apps/server/src/services/{rechnungService,stundennachweisService}.ts` |
| DB-Schema                                   | `apps/server/src/db/schema/{therapien,behandlungen,rechnungen,rechnungBehandlungen}.ts`                          |
| GraphQL                                     | `apps/server/src/schema/{types,queries,mutations}/*`                                                             |
| PDF-Renderer                                | `apps/server/src/pdf/{layout,rechnungPdf,stundennachweisPdf}.ts`                                                 |
| Web Forms/Pages                             | `apps/web/src/{components,pages,models}/**`                                                                      |
| E2E                                         | `apps/web/e2e/{uc-*.e2e.ts,pages/*,helpers/seed.ts}`                                                             |

## Verifikation (End-to-End)

Nach jedem Milestone und abschließend:

1. `bun run --filter='*' typecheck`
2. `bun run --filter='*' test` — Unit/Integration auf allen Paketen.
3. `bun run --filter='web' e2e` — Playwright (Chromium); lokal mit
   `bun run --filter='web' e2e:install` einmalig.
4. Manueller Durchlauf gemäß PRD-UC-Szenarien (UC-3.1 bis UC-3.10)
   in der lokal gebauten App.
5. CI (`.github/workflows/ci.yml`): Lint + Typecheck + Test muss grün
   sein; E2E aktuell nicht in CI aktiv — bleibt vorerst lokal.

## Nicht-Ziele / Offene Entscheidungen

- **§5 PDF-Vorlagen-Technologie** — vor Umsetzung Spike + Entscheidung
  (Kandidaten: AcroForm mit pdf-lib-Feldern, `pdfme`, DOCX-Template →
  LibreOffice-headless, HTML-Template → Chromium). Kein Code in dieser
  Runde.
- **UC-3.8 Versandweg**: ZIP-Download ist der vorgeschlagene Default.
  Alternative „einzelne Downloads mit einem Klick markieren"
  implementieren wir nur, falls die Therapeutin das nach einer
  kurzen Abnahme so vorzieht.
- **Daten-Migration `arbeitsthema → taetigkeit`**: Freitext-Einträge
  werden pauschal auf `sonstiges` gemappt. Vor Merge sollte auf einer
  Kopie der produktiven DB einmal nachgeschaut werden, ob dort
  aussagekräftige Werte stehen, die sich genauer mappen lassen.
