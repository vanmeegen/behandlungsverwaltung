# PDF-Rechnungsvorlagen — Implementierungsplan

Stand: 2026-04-21. Basis: `pdftemplateconcept.md` (Entscheidungen in §8 und §9 dort sind verbindlich). Dieses Dokument beschreibt die konkrete Umsetzungsreihenfolge mit Datei-Pfaden, Tests und Risiken. **Keine Code-Änderung** bisher — nur Plan.

---

## 0. Zielzustand

- `rechnungPdf.ts` verwendet **AcroForm-Felder** der Vorlage für alle festen Textstellen und **zeichnet Tabellenzeilen** pro Behandlung in eine durch `layout.ts` definierte Zone.
- Briefkopf (Absender, Logo, Tabellenrahmen, Footer, USt-Hinweis, Zahlungsziel, Dankestext) kommt ausschließlich aus `briefvorlage.pdf`.
- `rechnungen` erhält ein neues Feld `rechnungsdatum` (vom Nutzer eingegeben, Default heute).
- Eine Rechnung = ein Kind, eine Zeile pro Behandlung, ein Tarif — konsistent mit heutiger Aggregation.
- Alle bestehenden E2E-Szenarien (UC-3.2 Rechnung erstellen) funktionieren weiter.

---

## 1. Phasen-Übersicht

| Phase | Thema                                         | Dauer (Schätzung) | Kritischer Pfad |
| ----- | --------------------------------------------- | ----------------- | --------------- |
| P1    | Vorlage bauen (`briefvorlage.pdf`)            | 1–2 h             | vor P5 nötig    |
| P2    | DB-Migration `rechnungsdatum`                 | 30 min            | vor P3          |
| P3    | GraphQL-Schema + Service-Signatur             | 1 h               | vor P5          |
| P4    | Frontend Eingabefeld Rechnungsdatum           | 1 h               | parallel zu P5  |
| P5    | PDF-Renderer umbauen                          | 3–4 h             | Kern            |
| P6    | Tests anpassen/ergänzen                       | 2–3 h             | nach P5         |
| P7    | PRD-Update, AGENTS.md, PRDcorrections abhaken | 30 min            | am Ende         |

**Empfohlene Reihenfolge**: P1 + P2 → P3 → (P4 parallel zu P5) → P6 → P7.

---

## 2. Phase 1 — Vorlage bauen

### 2.1 Artefakt

Datei: `data/templates/briefvorlage-rechnung-global.pdf` (oder pro Auftraggeber: `briefvorlage-rechnung-<auftraggeberId>.pdf`).

Der Dateiname wird bereits über `templateResolver.ts` + `templateFiles`-Tabelle aufgelöst — keine Namenskonvention nötig, aber die Datei muss über das `templateFiles`-Entry mit `kind='rechnung'` registriert sein.

### 2.2 Inhalt

- **Statische Elemente**:
  - Absenderkopf, Logo, Bankdaten, Steuernr.
  - Tabellenrahmen inkl. Spaltenüberschriften — an genau den Koordinaten, die in `layout.ts` definiert sind (siehe §6.1 für Koordinaten).
  - Footer: USt-Hinweis („Umsatzsteuerfreie Leistungen gem. § 4 Nr. 14 UStG" — entspricht AC-RECH-08), Zahlungsziel, Dankestext, Unterschriftsblock.

- **AcroForm-Felder** (Namen exakt, Groß-/Kleinschreibung beachtet):

| Feldname            | Typ  | Multiline | Zweck                                                                                                                |
| ------------------- | ---- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `empfaengerAdresse` | Text | ja        | 3–4 Zeilen Empfänger                                                                                                 |
| `rechnungsnummer`   | Text | nein      | Kann mehrfach mit demselben Namen platziert werden (oben rechts + „Rechnung Nr. …") — `pdf-lib` füllt alle Instanzen |
| `rechnungsdatum`    | Text | nein      | `DD.MM.YYYY`                                                                                                         |
| `leistungszeitraum` | Text | nein      | `01.MM.YYYY – letzter-Tag.MM.YYYY`                                                                                   |
| `einleitungstext`   | Text | ja        | Satz mit Therapieform                                                                                                |
| `kindTitel`         | Text | nein      | Titelzeile über Tabelle                                                                                              |
| `gesamtsumme`       | Text | nein      | `189,78 €`                                                                                                           |
| `unterschriftName`  | Text | nein      | optional                                                                                                             |

### 2.3 Aufgaben

- [ ] Therapeutin erstellt `briefvorlage.pdf` in PDF-XChange Editor.
- [ ] Entwickler prüft Vorlage: öffnet mit pdf-lib (`PDFDocument.load` + `doc.getForm().getFields()`), bestätigt dass alle Feldnamen aus §2.2 vorhanden sind.
- [ ] Vorlage über bestehenden `uploadTemplate`-Mechanismus (siehe `apps/server/src/schema/mutations/templates.ts`) in `data/templates/` ablegen.

---

## 3. Phase 2 — DB-Migration

### 3.1 Schema-Änderung

Datei: `apps/server/src/db/schema/rechnungen.ts`

Neues Feld:

```ts
rechnungsdatum: integer('rechnungsdatum', { mode: 'timestamp' })
  .notNull()
  .$defaultFn(() => new Date()),
```

Platzierung im Schema direkt unter `gesamtCents`. Die `$defaultFn` deckt DB-Inserts ab, die keinen Wert mitgeben — der Default-Wert im UI bleibt „heute", sodass die Mutation den Wert explizit setzt.

### 3.2 Migration

- [ ] `bun run db:generate` — erzeugt `drizzle/0003_add_rechnungsdatum.sql`.
- [ ] Migration prüfen und um Backfill erweitern:

```sql
ALTER TABLE `rechnungen` ADD COLUMN `rechnungsdatum` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `rechnungen` SET `rechnungsdatum` = `created_at` WHERE `rechnungsdatum` = 0;
```

Hintergrund: SQLite erlaubt `ALTER TABLE ADD COLUMN NOT NULL` nur mit konstantem Default. Der `0`-Default ist ein kurzer Übergangszustand; das `UPDATE` direkt danach setzt den Wert für Bestandsdaten auf `created_at`. Für neue Zeilen greift das `$defaultFn`/der App-seitig übergebene Wert — der SQL-Default ist danach nie mehr relevant.

- [ ] `bun run db:migrate` lokal ausführen, Rechnungen-Tabelle inspizieren.

### 3.3 Aufgaben

- [ ] Schema-File anpassen
- [ ] Migration generieren und um `UPDATE`-Statement ergänzen
- [ ] Schema-Snapshot-Tests (`apps/server/src/__tests__/db/schema.spec.ts`) erweitern, falls sie Feldlisten erwarten

---

## 4. Phase 3 — GraphQL-Schema + Service-Signatur

### 4.1 Input-Typ erweitern

Datei: `apps/server/src/schema/types/rechnungInput.ts`

```ts
export const CreateMonatsrechnungInputRef = builder.inputType('CreateMonatsrechnungInput', {
  fields: (t) => ({
    year: t.int({ required: true }),
    month: t.int({ required: true }),
    kindId: t.id({ required: true }),
    auftraggeberId: t.id({ required: true }),
    rechnungsdatum: t.string({ required: true }), // ISO-Datum YYYY-MM-DD
    force: t.boolean({ required: false }),
  }),
});
```

Begründung für `string` statt custom `DateTime`-Scalar: MVP-tauglich, konsistent mit der bestehenden `createdAt: t.string(...)`-Ausgabe in `RechnungRef`. Validierung und Parsing in der Mutation.

### 4.2 Output-Typ erweitern

Datei: `apps/server/src/schema/types/rechnung.ts`

Neues Feld:

```ts
rechnungsdatum: t.string({ resolve: (r) => r.rechnungsdatum.toISOString() }),
```

### 4.3 Mutation-Resolver

Datei: `apps/server/src/schema/mutations/rechnung.ts`

- `rechnungsdatum`-String in Mutation parsen (`new Date(args.input.rechnungsdatum)`), bei ungültigem Datum GraphQL-Fehler `VALIDATION_ERROR` werfen.
- Wert an `createMonatsrechnung` durchreichen.

### 4.4 Service-Signatur

Datei: `apps/server/src/services/rechnungService.ts`

```ts
export interface CreateRechnungInput {
  year: number;
  month: number;
  kindId: number;
  auftraggeberId: number;
  rechnungsdatum: Date; // NEU
  force?: boolean;
}
```

- Beim Insert in `rechnungen` `rechnungsdatum` setzen.
- Bei `force=true` in `db.update(rechnungen).set({...})` das `rechnungsdatum` **nicht** überschreiben, wenn der Nutzer es nicht geändert hat — einfacher: immer überschreiben, da Nutzer im UI das Feld explizit sieht und ggf. bestätigt. **Entscheidung**: bei Korrektur immer aktualisieren (konsistent mit der Semantik „Rechnung wird neu ausgestellt").

### 4.5 Aufgaben

- [ ] `rechnungInput.ts` erweitern
- [ ] `rechnung.ts` (types) erweitern
- [ ] `rechnung.ts` (mutation) erweitern + Parsing/Validierung
- [ ] `rechnungService.ts` erweitern
- [ ] `RechnungPdfInput` (in `pdf/rechnungPdf.ts`) um `rechnungsdatum: Date` und `monatName: string` erweitern (für §5 vorbereiten)
- [ ] Unit-Tests `rechnungService.spec.ts`, `rechnung.createMonatsrechnung.spec.ts` anpassen (neues Pflichtfeld in Test-Fixtures)

---

## 5. Phase 4 — Frontend (Eingabefeld Rechnungsdatum)

### 5.1 Draft-Store

Datei: `apps/web/src/models/RechnungStore.ts`

- `RechnungDraft`-Klasse um `rechnungsdatum: string` (ISO `YYYY-MM-DD`) erweitern, im Konstruktor mit heute vorbelegen (ableitbar aus `new Date().toISOString().slice(0, 10)`).
- `setRechnungsdatum(date: string)`-Setter.
- `reset()` setzt den Wert erneut auf „heute".
- `valid()` prüft zusätzlich, dass `rechnungsdatum` einem gültigen ISO-Datum entspricht.
- `saveDraft` reicht `rechnungsdatum` an `create`/Mutation-Variablen durch.
- `CREATE_MONATSRECHNUNG`-GraphQL-String um das neue Pflichtfeld ergänzen.

### 5.2 Page

Datei: `apps/web/src/pages/RechnungCreatePage.tsx`

- Zusätzliches `<TextField type="date">` im Formular — Label „Rechnungsdatum", `data-testselector="rechnung-create-rechnungsdatum"`.
- Value: `draft.rechnungsdatum`; onChange: `draft.setRechnungsdatum(e.target.value)`.

### 5.3 RechnungStore-Test

Datei: `apps/web/src/__tests__/stores/RechnungStore.spec.ts`

- Fixture-Setup um `rechnungsdatum` erweitern.
- Test: Default = heute.
- Test: `valid()` falsch bei leerem `rechnungsdatum`.

### 5.4 Aufgaben

- [ ] `RechnungStore.ts` + Draft + GraphQL-String aktualisieren
- [ ] `RechnungCreatePage.tsx` Feld hinzufügen
- [ ] `RechnungStore.spec.ts` anpassen
- [ ] Component-Test `RechnungListPage.spec.tsx` prüfen — zeigt ggf. `rechnungsdatum`-Spalte (optional, nicht zwingend)

---

## 6. Phase 5 — PDF-Renderer umbauen (Kern)

### 6.1 Layout-Konstanten

Datei: `apps/server/src/pdf/layout.ts`

Reduzieren auf die Tabellenzone. Beispiel-Werte (final abgestimmt mit Vorlage):

```ts
export const LAYOUT = {
  // Tabellenzone (in pt, Ursprung unten-links)
  tableTopY: 540,
  tableBottomY: 180,
  rowHeight: 16,
  columns: {
    posX: 56,
    mengeX: 100,
    einheitX: 140,
    bezeichnungX: 180,
    einzelX: 430,
    gesamtX: 500,
  },
  tableFontSize: 10,
  tableFont: 'Helvetica',
};
```

Die Werte werden mit der gebauten `briefvorlage.pdf` abgestimmt (gleicher Tabellenrahmen in der Vorlage).

### 6.2 Renderer-Rewrite

Datei: `apps/server/src/pdf/rechnungPdf.ts`

Neues Interface:

```ts
export interface RechnungPdfInput {
  templateBytes: Uint8Array;
  nummer: string;
  rechnungsdatum: Date;
  year: number;
  month: number;
  monatName: string; // „Januar", „Februar", ...
  kind: { vorname; nachname; aktenzeichen; strasse; hausnummer; plz; stadt };
  auftraggeber: AuftraggeberForPdf;
  therapieForm: TherapieFormValue; // NEU: für Einleitungstext
  stundensatzCents: number;
  lines: RechnungPdfLine[];
  gesamtCents: number;
}
```

Hinweis: `lines` behält die aktuelle Struktur (`datum, taetigkeit, taetigkeitLabel, be, zeilenbetragCents`).

Pipeline:

1. `doc = await PDFDocument.load(templateBytes)`
2. `form = doc.getForm()`
3. Helper `setIfPresent(form, name, value)` — setzt per `form.getTextField(name).setText(value)` mit Try/Catch; fehlende Felder werden still übersprungen.
4. Felder befüllen:
   - `empfaengerAdresse` ← `auftraggeberLines(input.auftraggeber).join('\n')`
   - `rechnungsnummer` ← `input.nummer`
   - `rechnungsdatum` ← `formatDateDe(input.rechnungsdatum)` → `DD.MM.YYYY`
   - `leistungszeitraum` ← `formatLeistungszeitraum(input.year, input.month)` → `01.MM.YYYY – letzter-Tag.MM.YYYY`
   - `einleitungstext` ← `` `Mein Honorar für die Teilmaßnahme ${THERAPIE_FORM_LABELS[therapieForm]} betrug im Monat ${monatName} ${year}:` ``
   - `kindTitel` ← `` `${vorname} ${nachname} · ${aktenzeichen} · im ${monatName} ${year}` ``
   - `gesamtsumme` ← `formatEuroPlain(input.gesamtCents)`
   - `unterschriftName` ← `` `${vorname} ${nachname}` ``
5. Tabellenzeilen zeichnen (`page = doc.getPage(0)`):
   ```ts
   let y = LAYOUT.tableTopY;
   for (const [i, line] of lines.entries()) {
     page.drawText(String(i + 1), { x: posX, y, size, font });
     page.drawText(String(line.be), { x: mengeX, y, size, font });
     page.drawText('BE', { x: einheitX, y, size, font });
     page.drawText(
       `${formatDateDe(line.datum)} · ${line.taetigkeitLabel ?? THERAPIE_FORM_LABELS[therapieForm]}`,
       { x: bezeichnungX, y, size, font },
     );
     page.drawText(formatEuroPlain(input.stundensatzCents), { x: einzelX, y, size, font });
     page.drawText(formatEuroPlain(line.zeilenbetragCents), { x: gesamtX, y, size, font });
     y -= rowHeight;
     if (y < LAYOUT.tableBottomY) throw new TooManyBehandlungenError(...);
   }
   ```
6. `form.flatten()` — alle Felder werden zu statischem Inhalt.
7. `return await doc.save()` — wie bisher.

### 6.3 Neuer Fehlertyp

```ts
export class TooManyBehandlungenError extends Error {
  constructor(count: number, max: number) {
    super(
      `Zu viele Behandlungen (${count}) — maximal ${max} pro Seite in Phase 1. Paginierung ist noch nicht implementiert.`,
    );
    this.name = 'TooManyBehandlungenError';
  }
}
```

- Wird aus `renderRechnungPdf` geworfen, in `rechnungService.ts` propagiert, in `rechnung.ts` (mutation) in einen GraphQL-Fehler `TOO_MANY_BEHANDLUNGEN` übersetzt.
- UI: in `RechnungStore.parseErrorCode` + `RechnungCreatePage` eine Alert-Nachricht anzeigen.

### 6.4 Hilfsfunktionen (neu)

Datei: `packages/shared/src/format/` (neue Helfer, testbar)

- `formatDateDe(d: Date): string` — gibt `DD.MM.YYYY` zurück. Ersetzt lokale `Intl`-Duplikate.
- `formatLeistungszeitraum(year: number, month: number): string` — `01.MM.YYYY – letzter-Tag.MM.YYYY`.
- `monatName(month: number): string` — `'Januar' … 'Dezember'` (deterministisch, keine Locale-Abhängigkeit).

### 6.5 `rechnungService.ts` Service-Glue

- `monatName` aus `monat` ableiten (neuer Helper).
- Therapie zum Kind lesen (`therapien.form`) — ein `.select().from(therapien).where(and(eq(kindId), eq(auftraggeberId))).limit(1)` reicht aus. Bei fehlender Therapie: Fehler „Für Kind X beim Auftraggeber Y keine Therapie angelegt — bitte zuerst Therapie erfassen".
- `therapieForm` an `RechnungPdfInput` durchreichen.

### 6.6 Aufgaben

- [ ] `layout.ts` neu schreiben
- [ ] `rechnungPdf.ts` komplett umbauen
- [ ] `TooManyBehandlungenError` anlegen + GraphQL-Error-Code mappen
- [ ] Shared-Format-Helfer (`formatDateDe`, `formatLeistungszeitraum`, `monatName`) + Unit-Tests
- [ ] `rechnungService.ts` um Therapie-Lookup und `therapieForm`-Durchreichung ergänzen
- [ ] `rechnungPdfSpec` Fixture-Strategy aktualisieren (siehe §7.2)

---

## 7. Phase 6 — Tests

### 7.1 Unit: Format-Helfer

Datei: `packages/shared/src/__tests__/format.spec.ts` (neu)

- `formatDateDe(new Date('2026-01-19')) === '19.01.2026'`
- `formatLeistungszeitraum(2026, 1) === '01.01.2026 – 31.01.2026'`
- `formatLeistungszeitraum(2026, 2) === '01.02.2026 – 28.02.2026'` (Nicht-Schaltjahr)
- `formatLeistungszeitraum(2028, 2) === '01.02.2028 – 29.02.2028'` (Schaltjahr)
- `monatName(1) === 'Januar'`, `monatName(12) === 'Dezember'`

### 7.2 Unit: Renderer

Datei: `apps/server/src/__tests__/pdf/rechnungPdf.spec.ts`

Die bestehenden Tests gehen von code-gezeichnetem Briefkopf aus. **Müssen neu geschrieben werden.**

- Neue Fixture: `apps/server/src/__tests__/pdf/fixtures/test-briefvorlage.pdf` — minimale A4-Vorlage mit allen AcroForm-Feldern aus §2.2. Einmalig mit PDF-XChange Editor oder via `pdf-lib` `PDFForm.createTextField(...)` programmatisch erzeugbar. **Empfehlung**: Fixture programmatisch in einem Test-Setup (`beforeAll`) erzeugen, um sie reproduzierbar zu halten.
- Assertions über `pdf-parse`:
  - Text enthält `RE-2026-04-0001`
  - Text enthält `01.04.2026 – 30.04.2026`
  - Text enthält `13.03.2026` (Rechnungsdatum)
  - Text enthält `Anna Musterfrau · K-2026-001 · im April 2026`
  - Text enthält `Mein Honorar für die Teilmaßnahme Lerntherapie betrug im Monat April 2026`
  - Pro Behandlung genau eine Zeile mit Datum + Tätigkeit-Label + Beträgen
  - `270,00` als Gesamtsumme sichtbar
- Edge-Cases:
  - Behandlung mit `taetigkeit = null` → Bezeichnung fällt auf `THERAPIE_FORM_LABELS[therapieForm]` zurück
  - Vorlage ohne `unterschriftName`-Feld → kein Fehler, nur still überspringen
  - 11 Behandlungen → `TooManyBehandlungenError`

Tests werden bewusst **nicht** auf die AC-RECH-08-Sentenz geprüft (die steht in der Vorlage, nicht im generierten Text) — stattdessen wird im Service-Test (`rechnungService.spec.ts`) verifiziert, dass die Vorlagen-Datei geladen wurde und die Bytes > 0 sind. Optional: `form.flatten()`-Nachweis — nach Render keine Form-Felder mehr im PDF (`doc.getForm().getFields().length === 0`).

### 7.3 Unit: Service

Datei: `apps/server/src/__tests__/services/rechnungService.spec.ts`

- Neues Pflichtfeld `rechnungsdatum` in jedem Test-Input.
- Ein Test: fehlende Therapie für das Kind → klarer Fehler.
- Ein Test: bei `force=true` wird `rechnungsdatum` der Rechnung aktualisiert.

### 7.4 Unit: GraphQL-Mutation

Datei: `apps/server/src/__tests__/schema/rechnung.createMonatsrechnung.spec.ts`

- `rechnungsdatum` als Pflicht-Input verlangt; fehlender Wert → Validation Error.
- Ungültiges Datum (`"nicht-ein-datum"`) → Validation Error.

### 7.5 Unit: Store

Datei: `apps/web/src/__tests__/stores/RechnungStore.spec.ts`

- Draft defaultet auf `rechnungsdatum = heute`.
- `valid()` false bei leerem `rechnungsdatum`.
- `saveDraft` sendet `rechnungsdatum` an Mutation mit.

### 7.6 E2E

Datei: `apps/web/e2e/uc-3.2-rechnung.e2e.ts`

- Testselector `rechnung-create-rechnungsdatum` nutzen, Wert auf z. B. `2026-04-15` setzen.
- Nach Rechnung-Erzeugung: Link zum Download öffnen, PDF-Bytes fetchen (bestehender Weg), mit `pdf-parse` Text extrahieren.
- Assertion: `Anna Musterfrau · K-2026-001 · im April 2026` im PDF; Rechnungsdatum `15.04.2026` im PDF; eine Zeile pro Behandlung.

E2E-Fixture: Die existierende `apps/web/e2e/fixtures/template-rechnung.pdf` muss **ersetzt** werden durch eine Vorlage mit AcroForm-Feldern (siehe §7.2 — programmatisch generieren oder einmalig hinterlegen).

### 7.7 Aufgaben

- [ ] Format-Helfer-Tests schreiben
- [ ] `rechnungPdf.spec.ts` neu schreiben, Fixture-Strategy umsetzen
- [ ] Service-Tests anpassen
- [ ] Mutation-Tests anpassen
- [ ] Store-Tests anpassen
- [ ] E2E anpassen + Fixture aktualisieren
- [ ] Alle Tests grün (`bun run test`, `bun run e2e`)

---

## 8. Phase 7 — Dokumentation

### 8.1 PRD aktualisieren

Datei: `PRD.md`

- §5 „PDF-Vorlagen" umschreiben: Technologie-Entscheidung (pdf-lib + AcroForm) dokumentieren, Feld-Inventar aus `pdftemplateconcept.md` §4.2 verlinken.
- AC-RECH-08 bleibt bestehen — USt-Hinweis ist jetzt in der Vorlage, nicht im Code. AC-Text an diese Realität anpassen: „das PDF enthält den USt-Befreiungshinweis (über die Vorlage) und keinen USt-Ausweis."
- AC-TPL-01/02 bleiben gültig (Template-Resolver-Verhalten unverändert).
- Neues AC: **AC-RECH-09** (unit) — Given gültige Rechnungsdaten mit `rechnungsdatum=2026-04-15`, Then wird `15.04.2026` ins PDF-AcroForm-Feld `rechnungsdatum` geschrieben.
- Neues AC: **AC-RECH-10** (unit) — Given eine Rechnung mit N Behandlungen, Then enthält das PDF genau N Tabellenzeilen mit Datum + Tätigkeit-Label + BE + Beträgen.

### 8.2 PRDcorrections

Datei: `PRDcorrections.md`

- §5 abhaken/streichen.

### 8.3 AGENTS.md (falls relevant)

Datei: `AGENTS.md` — prüfen, ob Hinweise zur PDF-Vorlagen-Pflege (PDF-XChange Editor, Feldnamen) hinzukommen sollten.

### 8.4 Aufgaben

- [ ] PRD §5 überarbeiten
- [ ] AC-RECH-08 Text anpassen
- [ ] AC-RECH-09 + AC-RECH-10 ergänzen
- [ ] PRDcorrections §5 abhaken
- [ ] AGENTS.md optional ergänzen

---

## 9. Risiken & offene Punkte

### 9.1 Bekannte Risiken

- **AcroForm-Pflege durch Therapeutin**: Feldnamen müssen exakt passen. Risiko: Vertipper. **Mitigation**: Validator-Skript (`bun run scripts/validate-template.ts`) prüft, ob die Vorlage alle Pflichtfelder enthält, bevor sie akzeptiert wird. Optional.
- **Mehrere Instanzen `rechnungsnummer` in der Vorlage**: `pdf-lib` füllt laut Doku alle Instanzen mit demselben Feldnamen — falls nicht: Fallback auf zwei unterschiedliche Feldnamen (`rechnungsnummer`, `rechnungsnummer2`). Beim Bauen der ersten Vorlage verifizieren.
- **AcroForm-Feldbreite zu klein**: Überlauf wird beim `flatten()` sichtbar abgeschnitten. **Mitigation**: Test mit realistischen Maximallängen (lange Firmennamen, Doppelnamen), Test mit Adressen über 4 Zeilen.
- **Tabellenzone kollidiert mit Footer**: `TooManyBehandlungenError` fängt den Fall in Phase 1 ab — elegante Paginierung in Phase 2.
- **Bestehende Rechnungen** (falls vorhanden): Die Migration backfillt `rechnungsdatum = created_at`. PDFs der Altdaten bleiben unberührt (sie sind bereits auf Platte, wir re-rendern sie nicht automatisch).

### 9.2 Breaking-Change-Fenster

- Die Änderung an `CreateMonatsrechnungInput` (Pflichtfeld `rechnungsdatum`) ist **breaking** für API-Clients. Da die App ein Einzelbinary mit eingebettetem Frontend ist und es keine externen Clients gibt: unkritisch. Für den Fall, dass lokale Tests oder Skripte die alte Signatur verwenden, Suchen nach `createMonatsrechnung` und `CreateMonatsrechnungInput` im Repo.
- E2E-Fixture `template-rechnung.pdf` muss ersetzt werden — nicht nur hinzugefügt. Alte Snapshot-Tests ggf. anpassen.

### 9.3 Nicht-Ziele (Phase 1)

- **Paginierung** bei >10 Behandlungen — kommt in Phase 2 (eigener Plan, nicht Teil dieses Dokuments).
- **Stundennachweis-Vorlage** — nicht betroffen; dieser Plan adressiert nur `kind='rechnung'`.
- **Pro-Auftraggeber variable Einleitungstexte** — fester String im Code, siehe Konzept §8 Punkt 2.

---

## 10. Abnahmekriterien

- [ ] `bun run ci` grün (lint, typecheck, test, build)
- [ ] `bun run e2e` grün (UC-3.2 Rechnung erzeugen inkl. Rechnungsdatum-Feld)
- [ ] Generiertes PDF öffnet in allen getesteten Viewern (Adobe Reader, Firefox, Chrome, Vorschau)
- [ ] Manuelle Prüfung einer erzeugten Rechnung gegen das Referenz-Layout von Birgit Friedrich (visuelle Übereinstimmung der Briefkopf-Bereiche)
- [ ] Bei 3 Behandlungen: 3 Tabellenzeilen, leere Zeilen nicht vorhanden
- [ ] Bei 1 Behandlung: 1 Tabellenzeile, Gesamtsumme passt
- [ ] PDF hat nach `form.flatten()` keine editierbaren Felder mehr

---

## 11. Commit-Strategie (Vorschlag)

Kleine, reviewbare Commits in dieser Reihenfolge:

1. `feat(db): add rechnungsdatum column with created_at backfill`
2. `feat(shared): add formatDateDe, formatLeistungszeitraum, monatName helpers`
3. `feat(server): extend CreateMonatsrechnungInput with rechnungsdatum`
4. `feat(web): add Rechnungsdatum field to RechnungCreatePage`
5. `refactor(server): rewrite rechnungPdf to fill AcroForm + draw table rows`
6. `test(server): rewrite rechnungPdf.spec against AcroForm fixture`
7. `test(e2e): assert rechnungsdatum and per-behandlung rows in generated PDF`
8. `docs(prd): update §5 for AcroForm template + new AC-RECH-09/10`

Jeder Commit soll für sich passieren (`bun run ci` grün).
