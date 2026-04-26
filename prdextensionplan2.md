#/ PRD-Erweiterungen 2 — Implementierungsplan

Setzt die in Commit `6f65319` („feat(prd,pdf): align spec & layout with optimized
rechnungsvorlage") **neu in die PRD aufgenommenen** Anforderungen um, soweit sie
**über Phasen A–E aus `prdextensionsplan.md` hinausgehen**. Phasen A–E sind in
Code; ihre PRD-Inhalte werden hier nur referenziert.

## Methode

- **Strict Red → Green → Refactor pro AC.** Reihenfolge je Phase:
  1. **Red** — neuen Test schreiben (Validation/Resolver/Component/e2e), gegen
     den noch fehlenden Code laufen lassen, **rotes Ergebnis dokumentieren**
     (Test erscheint im Run, schlägt erwartet fehl).
  2. **Green** — minimale Implementation, bis genau dieser Test grün ist.
     Keine zusätzliche Logik einbauen, die nicht von einem Test gefordert ist.
  3. **Refactor** — Duplikate / Hilfsfunktionen ziehen, dann erneut
     `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`.
- Reihenfolge der Layer pro Phase: **Migration → Drizzle-Schema → Shared-Zod →
  GraphQL-Type/Input → Mutation/Query-Resolver → Web-Store → React-Component
  → e2e**. Jede Schicht erst grün, bevor die nächste aufmacht.
- Jede Phase ist ein **eigener Commit** (Conventional Commits, Body verweist
  AC-IDs aus PRD §9). Zwischen den Phasen bleibt das System lauffähig.
- Tests via package.json-Scripts (s. Memory): `bun run test`,
  `bun run --filter=@behandlungsverwaltung/shared test`, `bun run e2e`.

## Phasen-Reihenfolge

```
✅ G  Label-Rename (Therapieformen)
✅ H  Auftraggeber: 8 Gruppen-Stundensätze
✅ I  Therapie: Startdatum + Behandlungs-Validierung
✅ J  Therapieliste-Tabelle (Geleistete BE)
✅ K  Behandlung: Sonstiges-Freitext
✅ L  Behandlungsliste in Schnellerfassung („noch verfügbar" + Edit/Delete)
✅ M  Erziehungsberechtigte (neue Entity, 0–2 pro Kind)
✅ N  Direktlink „Rechnung öffnen"
✅ O  Vorlagen-Verwaltung — Listen-/Auto-Upload-UI
✅ P  Menü-Eintrag „Schnellerfassung" → „Behandlungen" (inkl. Route-Rename /schnellerfassung → /behandlungen)
✅ Q  Aufräumen / Querschnitt
```

> **Stand 2026-04-26**: Phasen G–Q committed, alle 154 Web-Tests + 219 Server-Tests grün.
> Route `/schnellerfassung` wurde in Phase P ebenfalls auf `/behandlungen` umbenannt
> (inkl. Redirect in `App.tsx` und `navigate()`-Aufruf in `BehandlungEditPage.tsx`).

Begründung: G und P sind kosmetisch und unabhängig (G zuerst, weil viele
Folgetests die neuen Labels referenzieren). H, I, K sind voneinander
unabhängige Stammdaten-/Behandlungserweiterungen. J braucht keine neuen Daten
und schließt an §3.7 an. L baut auf I (Startdatum-Verfügbarkeit) und K
(Sonstiges-Freitext-Anzeige) auf. M ist die größte Erweiterung (neue Entity);
sie ist auf vorhandenen Kind-Stammdaten-Code aufgesetzt und steht spät, weil
der Effekt auf andere Phasen klein ist. N und O sind UI-zentriert und
unabhängig.

---

## Phase G — Label-Rename Therapieformen

PRD §2.3, AC-TH-03, AC-BEH-04. **Nur Labels** (`THERAPIE_FORM_LABELS`). DB-Werte
und Enum-IDs (`'dyskalkulie' | 'lerntherapie' | 'lrs_therapie' | …`) bleiben.

### G.1 Red — `packages/shared`

- `packages/shared/src/__tests__/labels/therapie.spec.ts` (neu, falls fehlt):
  - `THERAPIE_FORM_LABELS.dyskalkulie === 'Dyskalkulie-Therapie'`
  - `THERAPIE_FORM_LABELS.lerntherapie === 'Lern-Therapie'`
  - `THERAPIE_FORM_LABELS.lrs_therapie === 'Legasthenie-Therapie'`
  - `TAETIGKEIT_LABELS` enthält dieselben drei umbenannten Werte.
- Run `bun run --filter=@behandlungsverwaltung/shared test`. Erwartetes
  Rot: drei `expected … to equal …`-Fails.

### G.2 Green

- `packages/shared/src/labels/therapie.ts`: drei Strings ändern.
- Erneut testen → grün.

### G.3 Red — Folgetests, die alte Labels hart-kodieren

Dateien aus dem Mapping (alle Vorkommen `Lerntherapie`, `Dyskalkulietherapie`,
`LRS-Therapie` außerhalb des Labels-Files):

- `apps/server/src/__tests__/pdf/rechnungPdf.spec.ts`
- `apps/web/src/__tests__/stores/TherapieStore.spec.ts`
- `apps/web/e2e/uc-3.7-therapie.e2e.ts`
- `apps/web/e2e/uc-3.6-auftraggeber.e2e.ts` (Seed `rechnungskopfText`)
- `apps/web/e2e/uc-3.2-rechnung.e2e.ts` (PDF-Inhalt)
- `apps/web/e2e/uc-3.1-schnellerfassung.e2e.ts`
- `apps/web/e2e/uc-3.9-behandlung.e2e.ts` (sofern aus Phase L vorhanden)

Erst alle Vorkommen einsammeln (`grep -rn 'Lerntherapie\|LRS-Therapie\|Dyskalkulietherapie' apps packages`), dann **erst Tests** auf neue Strings umstellen — Tests sind rot.

### G.4 Green

- Quelltexte (Page-Object-Selectoren mit Label-Match, RegExp in PDF-Tests) auf
  neue Labels umstellen. Rechnungskopf-Text-Beispiel im UC-3.6-Seed:
  „Mein Honorar für die Lern-Therapie von …".
- `bun run lint && bun run typecheck && bun run test:ci && bun run e2e` grün.

### G.5 Commit

`refactor(labels): rename Dyskalkulie-/Lern-/Legasthenie-Therapie (AC-TH-03, AC-BEH-04)`

---

## Phase H — Auftraggeber: 8 Gruppen-Stundensätze

PRD §2.2, AC-AG-06. Acht **denormalisierte, optionale** Spalten am Auftraggeber.

### H.1 Red — Migration & Schema

- Skeleton-Test in `apps/server/src/__tests__/db/auftraggeber-schema.spec.ts`
  (neu): legt einen Auftraggeber mit `gruppe1Prozent: 80, gruppe2Stundensatz: 3600`
  an, liest zurück, prüft alle 8 Felder. Rot: Spalten existieren nicht.

### H.2 Green

- Migration `apps/server/drizzle/0006_auftraggeber_gruppensaetze.sql`
  (über `bun run --filter=@behandlungsverwaltung/server db:generate` erzeugen):

  ```sql
  ALTER TABLE auftraggeber ADD COLUMN gruppe1_prozent INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe1_stundensatz_cents INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe2_prozent INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe2_stundensatz_cents INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe3_prozent INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe3_stundensatz_cents INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe4_prozent INTEGER;
  ALTER TABLE auftraggeber ADD COLUMN gruppe4_stundensatz_cents INTEGER;
  ```

  Alle nullable. Prozent als ganze Zahl 0–100 (`%`); Stundensatz als
  `*Cents` (konsistent mit `stundensatzCents`).

- `apps/server/src/db/schema/auftraggeber.ts`: 8 Spalten als
  `integer('gruppe1_prozent')` etc.

### H.3 Red — Shared-Validation

- `packages/shared/src/__tests__/auftraggeber.spec.ts` ergänzen:
  - „Firma mit `gruppe1Prozent: 80` ist gültig"
  - „Firma mit `gruppe2Stundensatz: 3600` ist gültig"
  - „`gruppe1Prozent: -5` → Fehler `>= 0`"
  - „`gruppe1Prozent: 150` → Fehler `<= 100` (in Prozent)" — PRD lässt offen,
    Standard-Untergrenze 0, Obergrenze 100 für %.
  - „`gruppe1Stundensatz: -1` → Fehler `>= 0`".
  - „leeres Objekt ohne Gruppen-Felder bleibt gültig (alle optional)".

### H.4 Green

- `packages/shared/src/validation/auftraggeber.ts`:
  - Helper `gruppeProzent: z.number().int().min(0).max(100).nullish()` für die
    4 `*Prozent`-Felder; `gruppeStundensatzCents: z.number().int().min(0).nullish()`
    für die 4 `*StundensatzCents`-Felder.
  - Beide Schemas (`firmaSchema`, `personSchema`) erweitern.

### H.5 Red — GraphQL

- `apps/server/src/__tests__/schema/auftraggeber.createAuftraggeber.spec.ts`:
  Round-Trip mit allen 8 Feldern. Rot: Felder im Input/Type unbekannt.
- `apps/server/src/__tests__/schema/auftraggeber.updateAuftraggeber.spec.ts`:
  Update-Pfad — Feld setzen, dann auf `null` zurücksetzen.

### H.6 Green

- `apps/server/src/schema/types/auftraggeber.ts`: 8 `t.exposeInt(…, { nullable: true })`.
- `apps/server/src/schema/types/auftraggeberInput.ts`: 8 optionale `t.int`.
- `apps/server/src/schema/mutations/auftraggeber.ts`: Felder durchreichen
  (create+update), `null` korrekt persistieren.

### H.7 Red — Web

- `apps/web/src/__tests__/components/AuftraggeberForm.spec.tsx`:
  - „Bei Typ Firma erscheint ein Abschnitt „Gruppentherapie-Stundensätze" mit
    je 4 Zeilen × 2 Feldern (`gruppeNProzent`, `gruppeNStundensatz`)."
  - „Bei Typ Person ist der Abschnitt **nicht** sichtbar."
  - „Speichern mit nur `gruppe1Prozent=80` funktioniert; die übrigen 7 Felder
    bleiben `null` im Mutation-Payload."

### H.8 Green

- `apps/web/src/components/AuftraggeberForm.tsx`: 8 Felder als Material-`TextField`
  (`type="number"`); Selektoren `data-testselector="auftraggeber-form-gruppeN-prozent"`
  und `…-gruppeN-stundensatz` für `N=1..4`. Stundensatz wird in Euro eingegeben
  und vor Mutation in Cents umgerechnet (analog `stundensatzCents`-Bestandscode).
- `AuftraggeberStore` / `AuftraggeberDraft`: 8 Setter; Reset-Pfad sauber.
- GraphQL-Operations in `AuftraggeberStore`: Felder im
  `AuftraggeberFragment`/`Input` ergänzen.

### H.9 Red — e2e

- `apps/web/e2e/uc-3.6-auftraggeber.e2e.ts`: Szenario
  „Auftraggeber mit Gruppentherapie-Stundensätzen anlegen" — füllt
  `gruppe1Prozent=80`, `gruppe2Stundensatz=36,00 €`, prüft Detail- &
  Listen-Anzeige; AC-AG-06.

### H.10 Commit

`feat(auftraggeber): 8 optionale Gruppentherapie-Stundensätze (AC-AG-06)`

---

## Phase I — Therapie: Startdatum + Behandlungs-Datums-Validierung

PRD §2.3, §2.4, AC-TH-05, AC-BEH-07. UC-3.7-Szenario „Behandlung mit Datum vor
Startdatum".

### I.1 Red — Migration & Schema

- Test `apps/server/src/__tests__/db/therapien-startdatum.spec.ts`:
  Therapie mit `startdatum: '2026-04-01'` anlegen, zurücklesen, ISO-Match.
  Rot: Spalte fehlt.

### I.2 Green

- Migration `0007_therapie_startdatum.sql`:
  ```sql
  ALTER TABLE therapien ADD COLUMN startdatum INTEGER;
  UPDATE therapien
     SET startdatum = COALESCE(
       (SELECT MIN(datum) FROM behandlungen WHERE behandlungen.therapie_id = therapien.id),
       therapien.created_at
     )
   WHERE startdatum IS NULL;
  -- Drizzle erzeugt im selben File die NOT-NULL-Variante in einem zweiten Schritt:
  -- (SQLite kennt kein ALTER COLUMN, daher Standardmuster: temp-Tabelle ODER
  --  via Drizzle CREATE TABLE __new + INSERT … SELECT + DROP + RENAME.)
  ```
  Drizzle generiert das Tabellen-Recreation-Pattern automatisch, sobald
  `notNull()` im Schema gesetzt ist.
- `apps/server/src/db/schema/therapien.ts`:
  `startdatum: integer('startdatum', { mode: 'timestamp' }).notNull()`.

### I.3 Red — Shared-Validation

- `packages/shared/src/__tests__/therapie.spec.ts`:
  - „Therapie ohne `startdatum` → Fehler `Startdatum ist Pflicht`".
  - „`startdatum: '2026-04-01'` → gültig, normalisiert auf ISO".
- `packages/shared/src/__tests__/behandlung.spec.ts`:
  - **(Reine Schema-Validierung kennt keine Therapie-Daten — die
    Datumsuntergrenze gehört in den Resolver.)** Stattdessen Resolver-Test
    in I.5.

### I.4 Green

- `packages/shared/src/validation/therapie.ts`:
  `startdatum: z.string().min(1, 'Startdatum ist Pflicht').pipe(z.coerce.date())`.

### I.5 Red — Resolver / Cross-Field-Validation

- `apps/server/src/__tests__/schema/behandlung.createBehandlung.spec.ts`:
  - „Behandlung mit `datum < startdatum` → GraphQL-Error
    `Datum liegt vor dem Startdatum der Therapie` (`extensions.code = 'BEHANDLUNG_VOR_STARTDATUM'`)".
- `apps/server/src/__tests__/schema/behandlung.updateBehandlung.spec.ts`:
  Editier-Pfad gleichbehandelt.
- Server-`createTherapie`/`updateTherapie`-Specs: `startdatum` durchgereicht.

### I.6 Green

- `apps/server/src/schema/types/therapie.ts`:
  `startdatum: t.expose('startdatum', { type: 'String' /* ISO */ })`.
- `apps/server/src/schema/types/therapieInput.ts`: `startdatum: t.arg.string({ required: true })`.
- `apps/server/src/schema/mutations/therapie.ts`: in create+update durchreichen.
- Neue Domain-Funktion `packages/shared/src/domain/behandlungDatum.ts`:
  `assertDatumGeStartdatum(behandlungsDatum, therapieStartdatum)` — wirft eine
  Domain-Error-Klasse `BehandlungVorStartdatumError`.
- `apps/server/src/schema/mutations/behandlung.ts`: lädt Therapie, ruft Domain-
  Funktion, mappt auf GraphQL-Error.

### I.7 Red — Web

- `apps/web/src/__tests__/components/TherapieForm.spec.tsx`:
  - „Pflichtfeld `Startdatum` — leer → Validation-Fehler im Submit".
- `apps/web/e2e/uc-3.7-therapie.e2e.ts`: Szenario aus Commit `6f65319`
  bereits in PRD: „Behandlung mit Datum vor dem Startdatum wird abgelehnt".

### I.8 Green

- `TherapieForm.tsx`: `<DatePicker>`-Feld mit
  `data-testselector="therapie-form-startdatum"`. Default = heute.
- `TherapieStore` / `TherapieDraft`: `startdatum: string | null`,
  `setStartdatum`. GraphQL-Operations updaten.
- `TherapieDetailPage.tsx` / `TherapieList`: Anzeige Startdatum (DD.MM.YYYY).
- `apps/web/src/models/BehandlungStore.ts`: clientseitige
  Vor-Validierung (UX) — submit blockiert, wenn `datum < startdatum`; Fallback
  auf Server-Error bleibt erhalten.
- e2e-Seed `seedTherapie` nimmt `startdatum` (Pflicht). Alle bestehenden
  Aufrufer mit Default `'2026-01-01'` (oder älter als alle Behandlungs-Daten
  des Tests) versorgen.

### I.9 Commit

`feat(therapie): Startdatum (Pflicht) + Behandlungsdatum-Validierung (AC-TH-05, AC-BEH-07)`

---

## Phase J — Therapieliste-Tabelle: Geleistete BE

PRD §3.7, AC-TH-06.

### J.1 Red — Server-Query

- `apps/server/src/__tests__/schema/therapie.query.spec.ts`:
  - „`therapien { id geleisteteBe }` liefert für Therapie ohne Behandlungen `0`".
  - „mit drei Behandlungen je 2 BE → `geleisteteBe == 6`".

### J.2 Green

- `apps/server/src/schema/types/therapie.ts`:
  `geleisteteBe: t.int({ resolve: async (therapie, _args, { db }) => …`,
  Query: `SUM(be) FROM behandlungen WHERE therapie_id = ?`. Cache-friendly:
  Loader optional; in Phase 1 reicht direkter Aggregat-Query.

### J.3 Red — Web

- `apps/web/src/__tests__/components/TherapieList.spec.tsx`:
  - „Tabellenkopf `Nachname · Vorname · Geleistete BE · Therapieform` in dieser
    Reihenfolge".
  - „Zeile zeigt `Musterfrau · Anna · 0 · Lern-Therapie` für leere Therapie".

### J.4 Green

- `apps/web/src/components/TherapieList.tsx` / `TherapieListPage.tsx`: MUI
  `Table` mit den vier Spalten. `geleisteteBe` aus dem GraphQL-Result; Kind-
  Daten aus dem bestehenden `kindId`-Resolver-Eager-Load.
- GraphQL-Operation in `TherapieStore` ergänzt `geleisteteBe`, `kind { vorname nachname }`.

### J.5 Red — e2e

- `apps/web/e2e/uc-3.7-therapie.e2e.ts`: bestehendes Szenario
  „Lern-Therapie mit 60 BE anlegen" hat im PRD bereits zwei neue Then-
  Zeilen für die Tabellenstruktur — Test entsprechend erweitern.

### J.6 Commit

`feat(therapie): Therapieliste mit Spalte „Geleistete BE" (AC-TH-06)`

---

## Phase K — Behandlung: Sonstiges-Freitext (max. 35 Zeichen)

PRD §2.4, §3.2, AC-BEH-08, AC-BEH-09, AC-RECH-10 (angepasst). UC-3.1-Szenario
„Tätigkeit Sonstiges erfordert Pflicht-Freitext".

### K.1 Red — Migration & Schema

- Test in `apps/server/src/__tests__/db/behandlung-sonstiges.spec.ts`:
  Behandlung mit `sonstigesText: 'Hospitation Schule'` anlegen, zurücklesen.

### K.2 Green

- Migration `0008_behandlung_sonstiges_text.sql`:
  `ALTER TABLE behandlungen ADD COLUMN sonstiges_text TEXT;`
- `apps/server/src/db/schema/behandlungen.ts`:
  `sonstigesText: text('sonstiges_text')` (nullable).

### K.3 Red — Shared-Validation

- `packages/shared/src/__tests__/behandlung.spec.ts`:
  - „`taetigkeit='sonstiges'` ohne `sonstigesText` → Fehler
    `Beschreibung Pflicht bei Sonstiges`".
  - „`sonstigesText` 36 Zeichen → Fehler `max. 35 Zeichen`".
  - „`taetigkeit='lerntherapie'` mit `sonstigesText='x'` → Fehler
    `Sonstiges-Freitext nur bei Tätigkeit Sonstiges`".
  - „`taetigkeit='sonstiges'` + `sonstigesText='Hospitation Schule'` → gültig".

### K.4 Green

- `packages/shared/src/validation/behandlung.ts`: `sonstigesText: z.string().trim().max(35).nullish()`
  und `.superRefine` für Cross-Field-Regel.

### K.5 Red — Resolver

- `apps/server/src/__tests__/schema/behandlung.createBehandlung.spec.ts`:
  Pflicht-Pfad + Persist-Round-Trip.
- `apps/server/src/__tests__/services/rechnungAggregation.spec.ts`:
  „Bezeichnung enthält bei `taetigkeit='sonstiges'` den `sonstigesText` statt
  Label „Sonstiges"" (`<DD.MM.YYYY> · Hospitation Schule`).

### K.6 Green

- GraphQL-Type/Input: `sonstigesText: t.exposeString('sonstigesText', { nullable: true })` /
  `t.arg.string({ required: false })`.
- `apps/server/src/services/rechnungAggregation.ts`: bei Bezeichnungsbau die
  Reihenfolge ist `sonstigesText (wenn taetigkeit==='sonstiges') > Tätigkeits-Label > Therapieform-Label` (Fallback-Kette laut PRD §3.2).

### K.7 Red — Web

- `apps/web/src/__tests__/components/Schnellerfassung.spec.tsx`:
  - „Wenn Tätigkeit auf `Sonstiges` gesetzt wird, erscheint ein
    Pflicht-Freitextfeld mit `maxLength=35` und Selektor
    `behandlung-form-sonstiges-text`".
  - „Bei anderer Tätigkeit verschwindet das Feld und der Wert wird vor dem
    Submit auf `null` zurückgesetzt".

### K.8 Green

- `SchnellerfassungPage.tsx` (oder genutzte Form-Komponente): conditional
  render via `draft.taetigkeit === 'sonstiges'`.
- `BehandlungStore` / `BehandlungDraft`: `sonstigesText: string | null`,
  `setSonstigesText`. Beim Wechsel der Tätigkeit, wenn neuer Wert nicht
  `'sonstiges'`, `sonstigesText = null` setzen.

### K.9 Red — e2e

- `apps/web/e2e/uc-3.1-schnellerfassung.e2e.ts`: bereits aus PRD-Diff:
  „Tätigkeit Sonstiges erfordert einen Pflicht-Freitext (max. 35 Zeichen)".
  Außerdem Erwartung „eine spätere Rechnungszeile dieser Behandlung enthält
  im Bezeichnungs-Label „Hospitation Schule" statt „Sonstiges"" — also
  Cross-UC-Probe in einem zweiten e2e-Schritt (Rechnung erzeugen + PDF-Inhalt
  prüfen) oder `rechnungPdf.spec.ts`-Snapshot.

### K.10 Commit

`feat(behandlung): Sonstiges-Freitext, max. 35 Zeichen, in Rechnungszeile (AC-BEH-08, AC-BEH-09, AC-RECH-10)`

---

## Phase L — Behandlungsliste in Schnellerfassung („noch verfügbar" + Edit/Delete)

PRD §3.1, AC-BEH-10, AC-BEH-11, UC-3.9.

### L.1 Red — Server (Verfügbarkeit + Delete)

- `apps/server/src/__tests__/schema/therapie.query.spec.ts`:
  - „`therapie { verfuegbareBe bewilligteBe geleisteteBe }` — `verfuegbareBe ===
bewilligteBe - geleisteteBe`, kann negativ sein und bleibt es bewusst".
- `apps/server/src/__tests__/schema/behandlung.deleteBehandlung.spec.ts` (neu,
  falls nicht vorhanden):
  - „`deleteBehandlung(id)` → entfernt Datensatz, gibt `id` zurück".
  - „`deleteBehandlung` einer Behandlung, die in einer Rechnung enthalten ist
    (`rechnung_behandlungen.behandlung_id`-FK) → Fehler `BEHANDLUNG_REFERENCED`".

### L.2 Green

- `apps/server/src/schema/types/therapie.ts`: `verfuegbareBe: t.int({ resolve: … })`
  (Wiederverwendung aus Phase J: `bewilligteBe - geleisteteBe`).
- `apps/server/src/schema/mutations/behandlung.ts`: `deleteBehandlung(id: ID!): ID!`
  — falls bereits vorhanden, nur den Referenz-Schutz ergänzen
  (`SELECT 1 FROM rechnung_behandlungen WHERE behandlung_id = ?`).

### L.3 Red — Web (Behandlungsliste)

- `apps/web/src/__tests__/components/SchnellerfassungBehandlungsliste.spec.tsx` (neu):
  - „Sobald `kindId` und `therapieId` im Store gesetzt sind, lädt die Liste
    alle Behandlungen der Therapie".
  - „Sortierung: Datum desc".
  - „Spalten Datum · Tätigkeit · BE in dieser Reihenfolge".
  - „Hinweis-Text `noch verfügbar: 52 BE` rechts neben der BE-Spalte".
  - „Speichern einer neuen Behandlung mit 2 BE → Hinweis ändert sich auf
    `noch verfügbar: 50 BE`".
  - „Klick auf `Bearbeiten` einer Zeile öffnet die Edit-Maske mit der ID".
  - „Klick auf `Löschen` öffnet `ConfirmDialog`; `Ja` → Zeile verschwindet,
    Hinweis aktualisiert sich".

### L.4 Green

- Neuer Sub-Component `apps/web/src/components/BehandlungsListeInline.tsx`:
  MUI `Table` + `verfuegbareBe`-Anzeige; nutzt `TherapieRef.verfuegbareBe` und
  `behandlungenByTherapie`-Query; sortiert client-seitig falls Server keine
  Order-By-Variante hat (sonst Server `ORDER BY datum DESC` ergänzen).
- `BehandlungStore`: nach erfolgreichem `createBehandlung`/`updateBehandlung`/
  `deleteBehandlung` einen Refetch der Therapie + Behandlungen auslösen.
- `SchnellerfassungPage.tsx`: Sub-Component nur rendern, wenn Kind+Therapie
  gewählt. Selektoren: `data-testselector="schnellerfassung-behandlungsliste"`,
  `…-zeile-{id}`, `…-noch-verfuegbar`.

### L.5 Red — Bearbeiten/Löschen-Routen

- `BehandlungEditPage.tsx` (existiert ggf. noch nicht):
  - Route `/behandlungen/:id/bearbeiten`, lädt via `behandlung(id)`-Query,
    submit ruft `updateBehandlung` (Edit-Pfad benutzt dieselbe Form wie
    Schnellerfassung; Sonstiges-Text-Logik aus Phase K nutzbar).
  - Test `apps/web/src/__tests__/components/BehandlungEditPage.spec.tsx`.

### L.6 Green

- Route in `App.tsx` ergänzen; PO-Class
  `apps/web/e2e/pages/BehandlungEditPage.ts`.

### L.7 Red — e2e

- `apps/web/e2e/uc-3.1-schnellerfassung.e2e.ts`: PRD-Szenario
  „Behandlungsliste mit „noch verfügbar"-Hinweis".
- `apps/web/e2e/uc-3.9-behandlung.e2e.ts` (neu): drei Szenarien aus PRD UC-3.9
  (`Behandlung bearbeiten`, `löschen`, `Abbrechen-Pfad`).

### L.8 Commit

`feat(behandlung): Inline-Liste mit „noch verfügbar"-BE + Edit/Delete (AC-BEH-10, AC-BEH-11, UC-3.9)`

---

## Phase M — Erziehungsberechtigte (neue Entity, 0 – 2 pro Kind)

PRD §2.5, §3.5, AC-KIND-04, AC-KIND-05, AC-EZB-01, AC-EZB-02. UC-3.5-Szenario
„Erziehungsberechtigte über Slot 1 erfassen". **Größte** Erweiterung; in zwei
Sub-Phasen geschnitten (M-Server, M-Web), beide separat committen.

### M.1 Red — Migration & Schema

- Test `apps/server/src/__tests__/db/erziehungsberechtigte-schema.spec.ts`:
  - „Erziehungsberechtigten zu Kind hinterlegen, zurücklesen mit allen Feldern".
  - „Zwei EZB im selben Slot für dasselbe Kind → DB-Constraint-Fehler
    (UNIQUE `(kind_id, slot)`)".
  - „Drei EZB an einem Kind → durch UI-Modell und API ausgeschlossen, aber
    DB-seitig nicht hart erzwungen — Test nicht nötig" (PRD AC-EZB-02 sagt
    explizit „durch UI-Modell ausgeschlossen").

### M.2 Green

- Migration `0009_erziehungsberechtigte.sql`:
  ```sql
  CREATE TABLE erziehungsberechtigte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind_id INTEGER NOT NULL REFERENCES kinder(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL,
    vorname TEXT NOT NULL,
    nachname TEXT NOT NULL,
    strasse TEXT,
    hausnummer TEXT,
    plz TEXT,
    stadt TEXT,
    email1 TEXT,
    email2 TEXT,
    telefon1 TEXT,
    telefon2 TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(kind_id, slot),
    CHECK(slot IN (1, 2))
  );
  ```
- `apps/server/src/db/schema/erziehungsberechtigte.ts`: Drizzle-Definition; in
  `index.ts` re-exportieren. Inferred Types `Erziehungsberechtigte`, `NewErziehungsberechtigte`.

### M.3 Red — Shared-Validation

- `packages/shared/src/validation/erziehungsberechtigte.ts` (neu):
- `packages/shared/src/__tests__/erziehungsberechtigte.spec.ts`:
  - AC-EZB-01: „Vorname & Nachname Pflicht — leer → Fehler
    `Vorname ist Pflicht` / `Nachname ist Pflicht`".
  - „Adressfelder alle leer → gültig (Adress-Fallback aus Kind, §2.5)".
  - „Eines der vier Adressfelder gesetzt → alle vier Pflicht; insbesondere
    `PLZ ist Pflicht` (entitätsübergreifende Adressregel §2)".
  - „E-Mails optional, aber wenn gesetzt: gültiges Format".
  - „Telefonnummern: optional, beliebige Strings (PRD definiert kein Format)".
  - „`slot` muss 1 oder 2 sein".

### M.4 Green

- `erziehungsberechtigteSchema = z.object({…}).superRefine(…)` mit Cross-Field-
  Adress-Regel: `someAddressField` → alle vier Pflicht.

### M.5 Red — GraphQL

- `apps/server/src/__tests__/schema/erziehungsberechtigte.createErziehungsberechtigte.spec.ts`:
  - „Anlegen Slot 1 mit Pflichtfeldern → liefert ID, ist über `kind { erziehungsberechtigte { … } }` lesbar".
  - „Zweiter Anlegevorgang Slot 1 für dasselbe Kind → Fehler
    `EZB_SLOT_BELEGT`".
- Update- und Delete-Spec analog.
- `apps/server/src/__tests__/schema/kind.query.spec.ts`: Kind mit zwei EZB lädt
  beide via Resolver-Feld `erziehungsberechtigte: [Erziehungsberechtigte!]!`.

### M.6 Green

- `apps/server/src/schema/types/erziehungsberechtigte.ts`,
  `…/types/erziehungsberechtigteInput.ts`,
  `…/queries/erziehungsberechtigte.ts` (`erziehungsberechtigteByKind`),
  `…/mutations/erziehungsberechtigte.ts` (`createErziehungsberechtigter`,
  `updateErziehungsberechtigter`, `deleteErziehungsberechtigter`).
- `apps/server/src/schema/types/kind.ts`: Feld
  `erziehungsberechtigte: [Erziehungsberechtigte!]!` mit Resolver, der nach
  `slot` ASC sortiert.

### M.7 Red — Adress-Fallback

- `apps/server/src/__tests__/services/erziehungsberechtigteAdresse.spec.ts`:
  - „EZB ohne eigene Adresse → Fallback liefert die Adresse des Kindes
    (Straße/Hausnummer/PLZ/Stadt aus `kinder`); EZB-Felder bleiben in DB leer".
  - „EZB mit eigener Adresse → eigene Adresse, Kind-Adresse wird nicht zurückgegeben".

### M.8 Green

- Helper `apps/server/src/services/erziehungsberechtigteAdresse.ts`:
  `effektiveAdresse(ezb, kind)` liefert das passende Quartett. Wird beim
  Lesen (z. B. Detail-Resolver `effektiveAdresse: t.field({…})`) und später
  auf der Druck-/PDF-Seite (außerhalb dieses Plans) verwendet.

### M.9 Commit Server

`feat(ezb): server side Erziehungsberechtigte entity (AC-EZB-01, AC-EZB-02, AC-KIND-05)`

### M.10 Red — Web (Slots im Kind-Formular)

- `apps/web/src/__tests__/components/KindForm.spec.tsx`:
  - „Im Edit-Modus zeigt das Formular zwei Slots
    `Erziehungsberechtigte 1` und `Erziehungsberechtigte 2`, beide leer
    bei einem frisch erstellten Kind".
  - „Slot 1 zeigt nach dem Speichern den Nachnamen der hinterlegten EZB".
  - „Klick auf `Bearbeiten` neben Slot 1 öffnet `ErziehungsberechtigterForm`
    (Modal oder eigene Route)".

### M.11 Green

- Neue Komponenten:
  - `apps/web/src/components/ErziehungsberechtigterForm.tsx` (Vorname,
    Nachname, Adressfelder, 2 E-Mails, 2 Telefone) — Selektoren
    `ezb-form-vorname` etc.
  - `apps/web/src/components/ErziehungsberechtigterSlot.tsx` (zeigt Nachname
    oder leeren Platzhalter, Button „Bearbeiten").
- `KindForm.tsx`: zwei Slots im Edit-Modus (Slots erst nach `kindId` bekannt;
  beim Erstanlegen werden Slots ggf. erst nach Speichern verfügbar — im PRD-
  Szenario erfolgt das Erfassen der EZB **nach** Anlegen des Kinds, daher
  Slots nur in `KindFormPage.tsx` im Edit-Modus zeigen).
- Neue Stores: `ErziehungsberechtigtenStore` mit GraphQL-Operations.
- Routen ergänzen: `/kinder/:id/erziehungsberechtigte/:slot` (Form-Page) oder
  Modal-Variante.

### M.12 Red — e2e

- `apps/web/e2e/uc-3.5-kind.e2e.ts`: PRD-Szenario
  „Erziehungsberechtigte über Slot „Erziehungsberechtigte 1" erfassen"
  (komplette Schritte aus PRD-Diff).
- Außerdem Negativ-Szenario: „PLZ Pflicht, wenn Adressfelder ausgefüllt sind".

### M.13 Commit Web

`feat(ezb): Kind-Formular mit zwei EZB-Slots + Form (AC-KIND-04, AC-KIND-05, AC-EZB-01, AC-EZB-02)`

---

## Phase N — Direktlink „Rechnung öffnen"

PRD §3.2, AC-RECH-19. **UI-only** — der Server liefert bereits `dateiname` und
einen Download-Endpoint (vgl. Rechnungsübersicht).

### N.1 Red — Web

- `apps/web/src/__tests__/components/RechnungCreatePage.spec.tsx` /
  `…/__tests__/stores/RechnungStore.spec.ts`:
  - „Nach erfolgreichem `createMonatsrechnung`-Mutation enthält der
    `successMessage`-State sowohl den Text `Rechnung erstellt: <Nummer>`
    als auch eine `pdfHref`-URL auf den Download-Endpoint der gerade
    erzeugten PDF".
  - „Im DOM erscheint ein `<a>` mit Text „Rechnung öffnen" und `target=_blank`".

### N.2 Green

- `RechnungStore`: Mutation-Result um `dateiname` erweitern; `pdfHref`
  aus Server-Pfad `/files/bills/<dateiname>` (oder bestehende Download-
  Route — ist aus `RechnungListPage.tsx` ableitbar).
- `RechnungCreatePage.tsx`: nach Submit `<Alert>` mit Text + `<Link>`
  „Rechnung öffnen" (`data-testselector="rechnung-create-success-link"`).

### N.3 Red — e2e

- `apps/web/e2e/uc-3.2-rechnung.e2e.ts`: bestehender Happy-Path um Schritt
  „die Bestätigungsmeldung enthält einen Link „Rechnung öffnen", der die
  soeben erzeugte PDF öffnet" (AC-RECH-19; PRD-Diff hat die Zeile bereits).

### N.4 Commit

`feat(rechnung): Direktlink „Rechnung öffnen" nach Erzeugung (AC-RECH-19)`

---

## Phase O — Vorlagen-Verwaltung: Liste + Auto-Upload

PRD §5 „Vorlagen-Verwaltung", AC-TPL-03, AC-TPL-04. UI-Refactor;
Server-API bleibt unverändert.

### O.1 Red — Web

- `apps/web/src/__tests__/components/TemplateListPage.spec.tsx` (neu):
  - „Tabellenkopf `Geltungsbereich · Typ · Datei`".
  - „Globale Vorlage zeigt `Geltungsbereich = Global`".
  - „Auftraggeber-Vorlage zeigt den Auftraggebernamen als Geltungsbereich".
  - „Spalte `Datei` ist ein PDF-Link (`<a href="/files/templates/<filename>" target="_blank">`)".
  - „`Neu`-Button öffnet `TemplateUploadPage`".
- `apps/web/src/__tests__/components/TemplateUploadPage.spec.tsx`:
  - „Es existiert **ein** Button `PDF-Datei hochladen`".
  - „Klick öffnet versteckten `<input type="file">` (programmatisch)".
  - „Sobald ein `change`-Event mit Datei feuert, **startet der Upload
    automatisch**, ohne dass ein zweiter Klick nötig ist".
  - „Während Upload zeigt der Button einen Lade-Indikator
    (`aria-busy=true`)".
  - „Nach erfolgreichem Upload erscheint Snackbar `Vorlage hochgeladen`".

### O.2 Green

- `apps/web/src/pages/TemplateListPage.tsx`: MUI `Table` mit den drei
  Spalten + `IconButton` „Entfernen" pro Zeile (UC-3.10 ist bereits
  implementiert; Spaltenstruktur ist neu).
- `apps/web/src/pages/TemplateUploadPage.tsx`: bisherige zwei Schritte
  („Datei wählen" + „Hochladen") zusammenfassen — `useRef` auf hidden
  input, `onChange` triggert direkt `templateStore.upload(file, kind, auftraggeberId)`.
- `TemplateStore`: `uploading: boolean`, `lastUploadResult` für Snackbar.

### O.3 Red — e2e

- `apps/web/e2e/templates.e2e.ts`: Szenario AC-TPL-03 (Listen-Spalten + PDF-
  Link öffnet PDF) und AC-TPL-04 (`PDF-Datei hochladen` startet automatisch
  - Snackbar). Bestehender UC-3.10-Test bleibt grün.

### O.4 Commit

`feat(templates): Listen-UI + Auto-Upload-Button (AC-TPL-03, AC-TPL-04)`

---

## Phase P — Menü-Eintrag „Schnellerfassung" → „Behandlungen"

PRD §3.1.

### P.1 Red

- `apps/web/src/__tests__/components/AppShell.spec.tsx` (neu falls fehlt):
  - „Im Drawer existiert ein NavLink mit Text `Behandlungen` und
    `data-testid='nav-behandlungen'`, der auf `/schnellerfassung` zeigt
    (Route bleibt aus Kompatibilitätsgründen)".
  - „Es gibt **keinen** sichtbaren Menüpunkt mit Text `Schnellerfassung`".

### P.2 Green

- `apps/web/src/components/AppShell.tsx`: Eintrag umbenennen — `label` und
  `testId`. Route `/schnellerfassung` bleibt zunächst, weil PRD nur das
  **Menü-Label** vorgibt (Re-Routing wäre eine separate Migration).
- e2e Page-Object und alle e2e-Tests, die per Klick auf das Drawer-
  Element navigieren, auf neuen Selektor `nav-behandlungen` umstellen
  (auch UC-3.1).

### P.3 Commit

`refactor(ui): rename Menüeintrag „Schnellerfassung" → „Behandlungen" (PRD §3.1)`

---

## Phase Q — Aufräumen / Querschnitt

- `apps/web/e2e/helpers/seed.ts`: Signaturen aller Helper auf neue
  Pflichtfelder bringen (`startdatum` bei `seedTherapie`,
  `sonstigesText` bei `seedBehandlung`, EZB-Helper). Sinnvolle Defaults.
- `implementationcorrections.md` / `implementationplan.md`: Phasen G–P als
  ✅ markieren, sobald jeweils committet.
- Final Run: `bun run lint && bun run typecheck && bun run test:ci && bun run e2e`.

---

## Zusammenfassung der AC-Abdeckung

| Phase | Abgedeckte AC                                |
| ----- | -------------------------------------------- |
| G     | AC-TH-03, AC-BEH-04                          |
| H     | AC-AG-06                                     |
| I     | AC-TH-05, AC-BEH-07                          |
| J     | AC-TH-06                                     |
| K     | AC-BEH-08, AC-BEH-09, AC-RECH-10 (angepasst) |
| L     | AC-BEH-10, AC-BEH-11                         |
| M     | AC-KIND-04, AC-KIND-05, AC-EZB-01, AC-EZB-02 |
| N     | AC-RECH-19                                   |
| O     | AC-TPL-03, AC-TPL-04                         |
| P     | PRD §3.1 (Menü-Label)                        |

Phasen G + P sind kosmetisch / Label-only (keine Migrationen). H, I, K, M
führen je eine Drizzle-Migration ein (nummeriert ab `0006`); J, L, N, O
ändern nur Schema-Felder/Resolver bzw. UI.
