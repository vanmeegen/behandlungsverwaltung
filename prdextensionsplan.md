# PRD-Erweiterungen — Implementierungsplan

Sechs PRD-Erweiterungen aus Commit `8a7d0c6` umsetzen.
Strenge Reihenfolge red → green → refactor; pro Phase erst Migration & Domain,
dann Server, dann Web, dann e2e. Jede Phase endet erst, wenn
`bun run lint && bun run typecheck && bun run test:ci && bun run e2e` grün ist.

Phasen sind so geschnitten, dass jede einzeln committbar ist und das System
zwischen den Phasen lauffähig bleibt.

---

## Phase A — Auftraggeber: `abteilung` + `rechnungskopfText`

PRD §2.2, AC-AG-04, AC-AG-05, AC-RECH-17, AC-RECH-18, UC-3.6.

### A.1 Migration

- Neue Drizzle-Migration via `bun run --filter=@behandlungsverwaltung/server db:generate`.
- `ALTER TABLE auftraggeber ADD COLUMN abteilung TEXT;`
- `ALTER TABLE auftraggeber ADD COLUMN rechnungskopf_text TEXT NOT NULL DEFAULT '';`
- Backfill-Statement im selben Migrations-File:
  `UPDATE auftraggeber SET rechnungskopf_text = 'Mein Honorar für die Teilmaßnahme … betrug im Monat …:' WHERE rechnungskopf_text = '';`
  (Bestandsdaten bleiben funktionsfähig; die Therapeutin pflegt den Text beim
  nächsten Bearbeiten sauber nach.)

### A.2 Drizzle-Schema

- `apps/server/src/db/schema/auftraggeber.ts`: Spalten ergänzen
  - `abteilung: text('abteilung')` (nullable)
  - `rechnungskopfText: text('rechnungskopf_text').notNull()`
- Re-export bleibt unverändert.

### A.3 Shared-Validierung

- `packages/shared/src/validation/auftraggeber.ts`:
  - `firmaSchema`: `abteilung: z.string().nullish().transform(toNullIfEmpty)` (optional, Whitespace → null);
    `rechnungskopfText: z.string().min(1, 'Rechnungskopf-Text ist Pflicht').transform((s) => s.trim())`.
  - `personSchema`: `abteilung` hart auf `null` (ungenutzt bei Person);
    `rechnungskopfText` analog Pflicht.
- Tests: `packages/shared/src/__tests__/validation/auftraggeber.spec.ts`
  → AC-AG-04 (`abteilung optional/Person ohne Abteilung`),
  AC-AG-05 (`leerer Rechnungskopf-Text → "Rechnungskopf-Text ist Pflicht"`).

### A.4 GraphQL

- `apps/server/src/schema/types/auftraggeber.ts`: `abteilung: t.exposeString('abteilung', { nullable: true })`,
  `rechnungskopfText: t.exposeString('rechnungskopfText')`.
- `apps/server/src/schema/types/auftraggeberInput.ts`: Felder im Input ergänzen
  (abteilung optional, rechnungskopfText required).
- `apps/server/src/schema/mutations/auftraggeber.ts`: `create` und `update`
  reichen die Felder durch; Validierung über `auftraggeberSchema`.
- Server-Resolver-Test (`apps/server/src/__tests__/`): Round-trip-Test mit beiden Feldern.

### A.5 Web-UI

- `apps/web/src/components/AuftraggeberForm.tsx`:
  - `Abteilung`-`TextField` mit `data-testselector="auftraggeber-form-abteilung"`,
    nur sichtbar wenn `draft.typ === 'firma'`.
  - `Rechnungskopf-Text`-`TextField` `multiline`, `minRows={3}`,
    `data-testselector="auftraggeber-form-rechnungskopf"`, immer sichtbar (auch bei Person).
- `AuftraggeberStore` / `AuftraggeberDraft`: Setter-Paare `setAbteilung`, `setRechnungskopfText`.
- `AuftraggeberDetailPage.tsx`: Abteilung (sofern vorhanden) + Rechnungskopf-Text anzeigen.
- GraphQL-Operations (`apps/web/src/graphql/`): Felder in `AuftraggeberFragment` und Input ergänzen.

### A.6 e2e

- `apps/web/e2e/uc-3.6-auftraggeber.e2e.ts`:
  - „Auftraggeber vom Typ Firma anlegen" um Abteilung + Rechnungskopf-Text erweitern (UC-3.6 Szenario aktualisiert).
  - Neues Szenario „Auftraggeber ohne Rechnungskopf-Text wird nicht gespeichert".
- `apps/web/e2e/helpers/seed.ts`: `createAuftraggeber` nimmt `rechnungskopfText` (Pflicht) und `abteilung?` an. Alle bestehenden Aufrufer mit sinnvollem Default versorgen.

---

## Phase B — Therapie: `gruppentherapie`

PRD §2.3, AC-TH-04, UC-3.7.

### B.1 Migration & Schema

- `ALTER TABLE therapien ADD COLUMN gruppentherapie INTEGER NOT NULL DEFAULT 0;`
- `apps/server/src/db/schema/therapien.ts`:
  `gruppentherapie: integer('gruppentherapie', { mode: 'boolean' }).notNull().default(false)`.

### B.2 Validierung

- `packages/shared/src/validation/therapie.ts`: `gruppentherapie: z.boolean().default(false)`.
- Test: Default-Wert + explizit `true`.

### B.3 GraphQL

- `apps/server/src/schema/types/therapie.ts`: `gruppentherapie: t.exposeBoolean('gruppentherapie')`.
- Input-Type ergänzen, Mutationen `createTherapie`/`updateTherapie` reichen den Wert durch.

### B.4 Web-UI

- `apps/web/src/components/TherapieForm.tsx`: `Checkbox` „Gruppentherapie" (`data-testselector="therapie-form-gruppentherapie"`), Default `false`.
- `TherapieStore`/`TherapieDraft`: `setGruppentherapie(value: boolean)`.
- `TherapieDetailPage.tsx` / `TherapieListPage.tsx`: Anzeige „Gruppentherapie: Ja|Nein".

### B.5 e2e

- `apps/web/e2e/uc-3.7-therapie.e2e.ts`: bestehendes Szenario „Lerntherapie mit 60 BE" prüft Default-`Nein`; neues Szenario „Therapie als Gruppentherapie anlegen".
- `seed.ts.createTherapie` akzeptiert `gruppentherapie?: boolean` (Default `false`).

---

## Phase C — Behandlung: `gruppentherapie` (mit Vorbelegung)

PRD §2.4, AC-BEH-06, UC-3.1.

### C.1 Migration & Schema

- `ALTER TABLE behandlungen ADD COLUMN gruppentherapie INTEGER NOT NULL DEFAULT 0;`
- `apps/server/src/db/schema/behandlungen.ts`:
  `gruppentherapie: integer('gruppentherapie', { mode: 'boolean' }).notNull().default(false)`.

### C.2 Validierung

- `packages/shared/src/validation/behandlung.ts`: `gruppentherapie: z.boolean().nullish()` (Resolver übernimmt Therapie-Default, analog `taetigkeit`).

### C.3 GraphQL & Resolver-Default

- Type/Input ergänzen.
- `apps/server/src/schema/mutations/behandlung.ts` (`create` + `update`):
  Wenn `gruppentherapie` im Input `null/undefined`, Wert aus Therapie ziehen
  (`SELECT gruppentherapie FROM therapien WHERE id = ?`). Selbe Stelle, wo heute schon der `taetigkeit`-Fallback lebt.
- Server-Test: Behandlung ohne `gruppentherapie` im Input erbt den Therapie-Wert; mit Wert überschreibt sie ihn.

### C.4 Web-UI

- Schnellerfassung (`apps/web/src/pages/SchnellerfassungPage.tsx` und genutzte Form-Komponente):
  - `Checkbox` „Gruppentherapie", `data-testselector="behandlung-form-gruppentherapie"`.
  - Beim Wechsel der Therapie-Auswahl: Vorbelegung aus `therapie.gruppentherapie` setzen, sofern die Nutzerin den Wert nicht bereits manuell überschrieben hat. Pattern wie für `taetigkeit` (existierende Logik im `BehandlungStore`).
- BehandlungEditPage / Detail (UC-3.9): Wert anzeigen und bearbeiten.

### C.5 e2e

- `uc-3.1-schnellerfassung.e2e.ts`: bestehendes Szenario um „Gruppentherapie ist mit Wert der Therapie vorbelegt" erweitern (PRD-Änderung ist bereits drin).
- `uc-3.9-behandlung-edit.e2e.ts` (sofern vorhanden, sonst neuer Spec): Editieren der Checkbox.

---

## Phase D — Rechnungsnummer: nur `NNNN` editierbar

PRD §3.2, §4, AC-RECH-15, UC-3.2 „Nur die laufende Nummer NNNN ist editierbar".

### D.1 Domänen-Helfer

- `packages/shared/src/domain/rechnungsnummer.ts`:
  - Neue Helper `nextFreeLfdNummer(existing: readonly string[], year: number): number` — Kern der bestehenden `generateRechnungsnummer`-Logik extrahiert; `generateRechnungsnummer` ruft ihn intern weiter auf.
  - `formatRechnungsnummer` und `parseRechnungsnummer` bleiben.
- Test: `nextFreeLfdNummer` (leeres Jahr → 1; Lücken werden bewusst nicht gefüllt; nächste freie = max+1).

### D.2 Server: Input + Service

- `CreateMonatsrechnungInputRef` (Pothos) bekommt `lfdNummer: t.arg.int({ required: false })`.
- `apps/server/src/schema/mutations/rechnung.ts`: Validierung
  `1 ≤ lfdNummer ≤ 9999`, ganzzahlig.
- `apps/server/src/services/nummer.ts`: neue Funktion
  `allocateOrUseNummer(db, year, month, lfdNummer?: number)`:
  - kein `lfdNummer` → `allocateNummer` wie heute (`nextFreeLfdNummer` + format).
  - mit `lfdNummer` → in jahresweiten existierenden Nummern auf Eindeutigkeit prüfen
    (alle `RE-${year}-*-${pad4(lfdNummer)}` ausschließen — exakter Vergleich auf `parsed.year + parsed.lfd`); bei Kollision `RechnungsnummerDuplicateError` werfen.
- `services/rechnungService.ts`: `CreateRechnungInput.lfdNummer?: number` durchreichen; bei `force=true` (Korrektur) wird der Override **ignoriert** und die bestehende Nummer beibehalten (PRD §4 „Korrektur lässt Nummer unverändert").
- GraphQL-Mapper in `mutations/rechnung.ts`: neue Fehlerklasse → `extensions.code = 'DUPLICATE_RECHNUNGSNUMMER'`.

### D.3 Server: nächste freie Nummer als Query

- Neue Query `nextFreeRechnungsLfdNummer(year: Int!): Int!` (`apps/server/src/schema/queries/`), Resolver liest alle bestehenden Nummern und ruft `nextFreeLfdNummer`.
- Wird vom Web genutzt, um das `NNNN`-Feld vorzubelegen.

### D.4 Web-UI

- `RechnungCreatePage.tsx`:
  - Aus `draft.year` + `draft.month` den Präfix `RE-YYYY-MM-` ableiten und als
    read-only `Typography` (oder disabled Adornment) anzeigen
    (`data-testselector="rechnung-create-prefix"`).
  - Neues `TextField` für `NNNN`, vierstellig, `inputMode="numeric"`,
    `data-testselector="rechnung-create-lfd"`. Wert in `RechnungStore.draftRechnung.lfdNummer`.
  - Bei Mount und bei jeder Jahres-Änderung: `nextFreeRechnungsLfdNummer({ year })` abrufen und als
    Vorbelegung setzen, sofern die Therapeutin das Feld nicht angefasst hat.
  - Submit übergibt `lfdNummer` (parsed Int) an `createMonatsrechnung`.
- `RechnungStore`: `lfdNummer` als Observable + `setLfdNummer`, `lfdNummerTouched` Flag, Reset bei `force`-Pfad.
- Fehlerausgabe: `DUPLICATE_RECHNUNGSNUMMER` → `Alert` mit Text „Diese Nummer ist im Jahr YYYY bereits vergeben."

### D.5 e2e

- `uc-3.2-rechnung.e2e.ts`:
  - Bestehendes Happy-Path-Szenario passt das vorbelegte `0001` an (AC-RECH-15 erste Hälfte).
  - Neues Szenario „Nur die laufende Nummer NNNN ist editierbar": Präfix als read-only sichtbar; `NNNN` auf `0007` ändern; PDF mit `RE-YYYY-MM-0007` erzeugt.
  - Negativfall: `0001` doppelt vergeben → Fehler „bereits vergeben".

---

## Phase E — PDF: `kindTitel` mit Geburtsdatum, `einleitungstext` aus Auftraggeber, Abteilung in Anschrift

PRD §5, AC-RECH-16, AC-RECH-17, AC-RECH-18.

### E.1 PDF-Input erweitern

- `apps/server/src/pdf/rechnungPdf.ts`:
  - `KindForPdf.geburtsdatum: Date`.
  - `AuftraggeberForPdf.abteilung: string | null`.
  - `RechnungPdfInput`: Therapieform-Feld bleibt für Tabellen-Bezeichnungen; **neu** `auftraggeberRechnungskopfText: string`.
  - `auftraggeberAdresse(ag)`: bei `typ === 'firma'` nach `firmenname` ein optional zweite Zeile mit `ag.abteilung` (sofern non-null).
  - `einleitungstext(input)`: ersetzt durch Rückgabe von `input.auftraggeberRechnungskopfText` (kein Therapieform-Satz mehr).
  - `kindTitel(input, monat)`: `${vorname} ${nachname} · geb. ${formatDateDe(geburtsdatum)} · ${aktenzeichen} · im ${monat} ${year}`.

### E.2 Service

- `apps/server/src/services/rechnungService.ts`:
  - `kind`-Daten ergänzen um `geburtsdatum`.
  - `auftraggeber`-Mapping ergänzt `abteilung` und `rechnungskopfText`.
  - PDF-Input befüllt; `therapie.form` wird **nur noch** für Tabellen-Bezeichnungs-Fallback (`THERAPIE_FORM_LABELS[input.therapieForm]`) genutzt.

### E.3 Tests

- Snapshot-/Unit-Test in `apps/server/src/pdf/__tests__/rechnungPdf.spec.ts`:
  - `empfaengerAdresse` enthält Abteilung als 2. Zeile (Firma mit Abteilung) bzw. nicht (Firma ohne / Person) — AC-RECH-18.
  - `einleitungstext` ist der wortgetreue `rechnungskopfText` — AC-RECH-17.
  - `kindTitel` enthält `geb. DD.MM.YYYY` — AC-RECH-16.
- Bestehende e2e UC-3.2 muss grün bleiben (Tabellen-Bezeichnung bleibt unverändert).

---

## Phase F — Aufräumen & Querschnitt

- `apps/web/e2e/helpers/seed.ts` & alle Test-Fixtures auf neue Pflichtfelder
  (Auftraggeber.rechnungskopfText) anpassen; Seed liefert sinnvolle Defaults.
- `implementationplan.md`: Phasen A–E als ✅ markieren, sobald jeweils committet.
- Lint-/Typecheck-Pässe nach jeder Phase: `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`.
- Conventional-Commits pro Phase, jeweils mit AC-Referenzen im Body.

---

## Reihenfolge-Begründung

A → B → C: reine Stammdaten-Erweiterungen, voneinander unabhängig.
D braucht keine A/B/C-Daten und kann parallel laufen, wird aber nach C
gebaut, damit der Schnellerfassungs-/Edit-Flow vorher stabil ist.
E setzt A voraus (`abteilung`, `rechnungskopfText`).

Phase F läuft kontinuierlich pro Phase mit (Seed/Tests aktualisieren),
nicht erst am Ende.
