# PDF-Rechnungsvorlagen — Konzept

Stand: 2026-04-21 (überarbeitet nach Rückmeldung). Grundlage: Analyse der zwei Referenz-PDFs (Elijah Wudi / Amelie Wittmann, Januar 2026) und Abgleich mit dem aktuellen Code (`apps/server/src/pdf/rechnungPdf.ts`, `services/rechnungService.ts`, `services/rechnungAggregation.ts`, `packages/shared/src/domain/rechnungMath.ts`, `db/schema/kinder.ts`, `db/schema/therapien.ts`) sowie PRD §5 und PRDcorrections §5.

> **Hinweis zur Referenzvorlage**: Die ausgehändigten PDFs stammen aus dem bestehenden manuellen Word-Workflow und enthalten zwei Eigenheiten, die für das neue System **nicht** übernommen werden sollen:
>
> - gleiche Rechnungsnummer auf beiden PDFs (`RE-01-2026-0002`) — **wird nicht übernommen**, die heutige Implementierung (eine eindeutige Nummer je Rechnung) bleibt gültig
> - zwei vorgedruckte Preisstufen (63,26/61,21) — **wird nicht übernommen**, pro Template gibt es genau eine Tarif-Kategorie
> - sechs feste, mit „0 BE / 0,0" befüllte Positionszeilen — **wird nicht übernommen**, leere Zeilen bleiben im neuen System leer

---

## 1. Analyse der beiden Referenz-PDFs

### 1.1 Statischer Teil des Briefkopfs (bleibt in der Vorlage)

Diese Elemente sind **Teil der `briefvorlage.pdf`**, werden nicht aus Daten gefüllt und ändern sich je Rechnung nicht:

- **Absenderkopf links oben**: Name (Birgit Friedrich), Qualifikationen, Kontaktdaten, Bankverbindung, Steuernummer, Finanzamt.
- **Logo rechts oben** („bewegtes Lernen") mit Claim „Therapeutische Hilfe für Familien".
- **Tabellenkopf** (Spaltenüberschriften „Pos · Anzahl · Einheit · Bezeichnung · Einzel € · Gesamt €") — Rahmen und Spaltenpositionen gehören zur Vorlage.
- **Footer**: USt-Hinweis („Umsatzsteuerfreie Leistungen gem. §4 (21) b UStG"), Zahlungsziel (30 Tage, Zielkonto), Dankestext, Unterschriftsblock.

### 1.2 Dynamischer Teil des Briefkopfs (AcroForm-Felder)

Diese Stellen erscheinen im Briefkopf-Bereich, ändern sich aber je Rechnung und werden über **AcroForm-Felder** in der Vorlage platziert, die die App füllt:

- **Empfängeradresse** (z. B. Finanzverwaltung S-II-E/W/F, Luitpoldstr. 3, 80335 München) — mehrzeilig
- **Rechnungsnummer** — erscheint an **zwei Stellen** (typischerweise Kopfbereich rechts + als Überschrift „Rechnung Nr. …"); wird über AcroForm-Felder gleichen oder unterschiedlichen Namens gesetzt
- **Rechnungsdatum** (Ausstellungsdatum)
- **Leistungszeitraum** (z. B. `01.01.2026 – 31.01.2026`)
- **Einleitungstext** — enthält die **Therapieform** (z. B. „integrative Lerntherapie"). Die Form kommt aus `therapien.form` des aktuellen Behandlungsstrangs. Beispiel: „Mein Honorar für die Teilmaßnahme **integrative Lerntherapie** betrug im Monat Januar 2026:"
- **Kindesname + Aktenzeichen** — als **Titelzeile über der Tabelle** (nicht je Tabellenzeile), z. B. „Elijah Wudi · WJH-03522/25 · im Januar 2026"
- **Gesamtsumme** unterhalb der Tabelle
- ggf. **Kindesname im Unterschriftsblock** (falls die Vorlage dort einen Platzhalter vorsieht)

### 1.3 Dynamischer Teil in der Tabellenzone

In den Referenz-PDFs ist die Tabelle vorgedruckt mit 6 festen Zeilen und zwei Preisstufen. **Für das neue System gilt davon abweichend**:

1. **Eine Tabellenzeile pro Termin / Behandlung** — keine Gruppierung, keine „Anzahl Termine"-Zusammenfassung, kein Datumsverketten per `;`.
2. **Eine Rechnung betrifft genau ein Kind** und genau einen Auftraggeber (wie heute in `createMonatsrechnung` bereits umgesetzt).
3. **Eine Tarif-Kategorie pro Template** — der Einzelpreis steht nicht in der Vorlage, sondern kommt aus `auftraggeber.stundensatzCents` (Stand heute, PRD §4).
4. **Leere Zeilen bleiben leer** — gibt es im Monat z. B. nur 3 Termine, werden 3 Tabellenzeilen gezeichnet; unterhalb folgt direkt die Gesamtsumme. Keine Pflicht-Mindestzeilen, keine Null-Zeilen.
5. **Kindesname + Aktenzeichen werden nicht je Zeile wiederholt**, sondern einmalig als Titelzeile oberhalb der Tabelle gesetzt (siehe §1.2).
6. **Spalten pro Zeile**: laufende Positionsnummer · Anzahl BE · Einheit „BE" · Bezeichnung · Einzelpreis · Gesamtpreis. Die Bezeichnung ist der **Label der `taetigkeit`** aus `behandlungen.taetigkeit` (z. B. „Dyskalkulietherapie", „Elterngespräch") plus Datum (`DD.MM.YYYY`). Beispiel: „19.01.2026 · Dyskalkulietherapie".

Die tatsächlich variablen Daten pro Zeile:

| Spalte      | Quelle                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pos         | laufender Index 1..n                                                                                                               |
| Anzahl      | `behandlungen.be`                                                                                                                  |
| Einheit     | fix „BE"                                                                                                                           |
| Bezeichnung | `TAETIGKEIT_LABELS[behandlung.taetigkeit]` + Datum, mit Fallback auf `THERAPIE_FORM_LABELS[therapie.form]`, wenn `taetigkeit` NULL |
| Einzel €    | `auftraggeber.stundensatzCents`                                                                                                    |
| Gesamt €    | `be × stundensatzCents`                                                                                                            |

---

## 2. Warum der heutige Overlay-Ansatz unzureichend ist

Der aktuelle Code in `apps/server/src/pdf/rechnungPdf.ts` und `apps/server/src/pdf/layout.ts` zeichnet mit `pdf-lib` an festen `(x, y)`-Koordinaten. Das bricht an mehreren Stellen, auch im vereinfachten neuen Modell (1 Zeile pro Termin, 1 Tarif):

1. **Bezeichnung wird bei 40 Zeichen abgeschnitten**: `page.drawText(bezeichnung.slice(0, 40), …)` (`rechnungPdf.ts:160`). Auch wenn wir pro Zeile nur `Datum + Taetigkeit-Label` schreiben, kann ein Label wie „Resilienztraining am 22.01.2026" je nach Schriftgröße knapp werden. Ein sauberes Umbrechen auf Wortgrenze fehlt.
2. **Briefkopf-Felder kommen aus der Vorlage, nicht aus Code-Koordinaten**: Empfängeradresse, Rechnungsnummer, Datum, Leistungszeitraum, Einleitungstext und Titelzeile Kind+Aktenzeichen werden heute nicht gefüllt oder an festen Koordinaten gezeichnet (`rechnungPdf.ts:90-121`). Der richtige Weg ist, sie an Positionen zu platzieren, die die Vorlage bestimmt — also AcroForm-Felder.
3. **Feste Zeilenhöhe**: `LAYOUT.bodyLineHeight = 16`. Selbst bei kurzen Bezeichnungen ist das okay; sobald Bezeichnungen mal mehrzeilig werden (z. B. langer Labeltext + Datum umgebrochen), verschieben sich nachfolgende Zeilen falsch.
4. **Keine Trennung Kopf/Tabellenzone**: der Overlay-Code kennt keinen definierten Tabellenbereich, den er beim Zeichnen nicht verlassen darf. Eine Kollision mit dem Footer wäre nicht ausgeschlossen.

**Fazit**: Overlay mit festen Koordinaten passt nicht zu einer Vorlage, in der die Therapeutin die Position jedes Feldes selbst bestimmen soll. Wir brauchen **AcroForm-Felder für die benannten Textstellen** plus eine **klar abgegrenzte Tabellenzone**, in die die App pro Behandlung eine Zeile zeichnet.

---

## 3. Ist-Stand im Code — was fehlt konkret?

### 3.1 Datenmodell

Prüfung der DB-Schemas:

| Benötigt im PDF                                        | Heute vorhanden?                                                                          | Anmerkung                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind.vorname`, `kind.nachname`                        | ✅ `kinder.vorname`, `.nachname`                                                          | —                                                                                                                                                                                                                                                           |
| `kind.aktenzeichen`                                    | ✅ `kinder.aktenzeichen` (`notNull`, `db/schema/kinder.ts:12`)                            | **Bereits vorhanden** — keine Migration nötig                                                                                                                                                                                                               |
| Therapieform (für Einleitungstext)                     | ✅ `therapien.form` + `THERAPIE_FORM_LABELS`                                              | Label-Abbildung in `packages/shared/src/labels/therapie.ts:4-12`. Pro Kind existiert eine Therapie pro Auftraggeber (siehe `therapien.ts:26-34`) — das liefert den Wert für den Einleitungstext.                                                            |
| Taetigkeit pro Behandlung (für Zeilen-Bezeichnung)     | ✅ `behandlungen.taetigkeit` (nullable) + `TAETIGKEIT_LABELS`                             | Fallback bei NULL auf `therapien.form`                                                                                                                                                                                                                      |
| Behandlungsdatum, BE                                   | ✅ `behandlungen.datum`, `.be`                                                            | —                                                                                                                                                                                                                                                           |
| Stundensatz                                            | ✅ `auftraggeber.stundensatzCents`                                                        | Eine Kategorie pro Auftraggeber, passt                                                                                                                                                                                                                      |
| Leistungszeitraum                                      | ✅ ableitbar aus `(year, month)`                                                          | Format: `01.MM.YYYY – letzter-Tag.MM.YYYY`                                                                                                                                                                                                                  |
| Rechnungsnummer                                        | ✅ `rechnungen.nummer` + `generateRechnungsnummer`                                        | Pro Rechnung eindeutig — bleibt                                                                                                                                                                                                                             |
| Rechnungsdatum                                         | ⚠️ heute = `rechnungen.createdAt`                                                         | **Entscheidung**: Nutzer gibt das Rechnungsdatum beim Erzeugen explizit ein, Vorbelegung = heute. Dazu neues Feld `rechnungen.rechnungsdatum` (Timestamp, notNull) + Eingabefeld im Erzeugen-Dialog. Das entkoppelt Rechnungsdatum von Erzeugungszeitpunkt. |
| Empfängeradresse                                       | ✅ `auftraggeber.*` (typ, firmenname, vorname, nachname, strasse, hausnummer, plz, stadt) | Formatierung wie in `auftraggeberLines` (`rechnungPdf.ts:50-61`)                                                                                                                                                                                            |
| Briefkopf-Blöcke (Bank, Steuernr., Logo, Footer-Texte) | ❌ nicht in DB                                                                            | Bleiben in der Vorlage — keine Daten                                                                                                                                                                                                                        |

**Konsequenz**: **Eine DB-Migration nötig**: `rechnungen.rechnungsdatum` (`integer('rechnungsdatum', { mode: 'timestamp' }).notNull()`). Für bestehende Rechnungen wird per Migration `rechnungsdatum = createdAt` gesetzt. Alle anderen Felder (inkl. `kinder.aktenzeichen`) passen bereits.

### 3.2 Aggregations-/Berechnungslogik

- `rechnungAggregation.ts:25 collectBehandlungen` liefert pro Behandlung eine Row, sortiert nach `datum` — genau das, was wir brauchen (eine Zeile pro Termin).
- `rechnungMath.ts:10 computeRechnungsLines` berechnet pro Eingabezeile `be * stundensatzCents` — passt.
- `sumZeilenbetraege` liefert die Gesamtsumme — passt.

**Fazit**: Die Aggregations- und Berechnungslogik bleibt unverändert. Keine Gruppierung, keine Zusatztext-Logik, keine zweite Preisstufe.

### 3.3 Rendering

`rechnungPdf.ts` muss umgebaut werden, um:

1. **AcroForm-Felder** der Vorlage zu füllen (statt Text an festen Koordinaten zu zeichnen):
   - `empfaengerAdresse`, `rechnungsnummer`, `rechnungsdatum`, `leistungszeitraum`, `einleitungstext`, `kindTitel` (Vorname + Nachname + Aktenzeichen + „im <Monat>"), `gesamtsumme`, optional `unterschriftName`.
2. **Tabellenzeilen** pro Behandlung in die definierte Tabellenzone zu zeichnen, eine Zeile pro Behandlung, leer wenn keine Behandlungen (sollte nach `KeineBehandlungenError` in `rechnungAggregation.ts:5` aber nicht auftreten — Early-Fail bleibt).
3. Nach dem Füllen **die Form zu flatten** (`form.flatten()`), damit das Dokument nicht mehr editierbar ist und in allen PDF-Viewern gleich aussieht.

Der `LAYOUT`-Block in `apps/server/src/pdf/layout.ts` wird reduziert auf die Tabellenzone (Start-Y, End-Y, Spalten-X-Koordinaten, Zeilenhöhe). Alle anderen Koordinaten fallen weg, weil sie aus der AcroForm-Position der Vorlage kommen.

---

## 4. Das zentrale Template-Design

Zwei konzeptionelle Ebenen:

**Ebene A — Statische Vorlage** (`briefvorlage.pdf`, von der Therapeutin gepflegt):

- Briefkopf (Absender, Logo, Bankdaten, Steuernummer)
- **AcroForm-Felder** an den gewünschten Positionen, mit klar definierten Namen (siehe §4.2)
- Tabellenrahmen mit Spaltenüberschriften und festen Spaltenbreiten — der **innere Bereich** der Tabelle bleibt leer, er ist die „Zeichenzone" für die App
- Footer (USt-Hinweis, Zahlungsziel, Dankestext, Unterschriftsblock)

**Ebene B — Von der App gefüllt**:

- AcroForm-Felder per pdf-lib befüllen
- Tabellenzone: pro Behandlung eine Zeile zeichnen (`drawText` + optionale `drawLine` für Trennstriche)
- Am Ende `form.flatten()`

### 4.1 Tabellenzone — wie definiert sich ihre Position?

**Entscheidung: feste Koordinaten im Code** (z. B. `x=56, yTop=540, yBottom=200, rowHeight=16`, Spalten-X in `layout.ts`). Die Therapeutin gestaltet den Tabellenrahmen und die Spaltenköpfe in der Vorlage an diesen abgestimmten Positionen — Code und Vorlage müssen sich einig sein.

Vorteil: kein zusätzliches Marker-Feld in der Vorlage, Pflege ist einfacher (nur die AcroForm-Felder und ein fester Tabellenrahmen).
Nachteil: Eine Verschiebung der Tabellenzone erfordert eine Code-Anpassung in `layout.ts`. Für das aktuelle Anwendungsbild mit einer Vorlage pro Auftraggeber akzeptabel.

### 4.2 AcroForm-Feld-Inventar (Konvention)

Die Vorlage muss folgende Feldnamen bereitstellen (Groß-/Kleinschreibung exakt):

| Feldname            | Typ              | Inhalt                                                                                    | Anmerkung                                                                                 |
| ------------------- | ---------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `empfaengerAdresse` | Text (multiline) | Firmenname/Person + Strasse + PLZ Stadt                                                   | 3–4 Zeilen                                                                                |
| `rechnungsnummer`   | Text             | z. B. `RE-2026-01-0001`                                                                   | Kann in der Vorlage mehrfach mit gleichem Namen existieren → pdf-lib füllt alle Instanzen |
| `rechnungsdatum`    | Text             | `13.03.2026`                                                                              | —                                                                                         |
| `leistungszeitraum` | Text             | `01.01.2026 – 31.01.2026`                                                                 | —                                                                                         |
| `einleitungstext`   | Text (multiline) | „Mein Honorar für die Teilmaßnahme integrative Lerntherapie betrug im Monat Januar 2026:" | Von der App aus Template-String + Therapieform-Label + Monatsname/-jahr zusammengebaut    |
| `kindTitel`         | Text             | `Elijah Wudi · WJH-03522/25 · im Januar 2026`                                             | Titelzeile über der Tabelle                                                               |
| `gesamtsumme`       | Text             | `189,78 €`                                                                                | —                                                                                         |
| `unterschriftName`  | Text             | `Elijah Wudi`                                                                             | optional, wenn die Vorlage im Unterschriftsblock einen Platzhalter hat                    |

Fehlt ein Feld in der Vorlage, akzeptiert die App das still und überspringt es (defensive Pflege — Therapeutin kann mit einer minimalen Vorlage starten und Felder schrittweise ergänzen).

### 4.3 Template-Konfigurationsdatei — braucht es eine?

**Nein.** Ursprünglich war `template.json` geplant (für Preise, Zeilenanzahl, Einleitungstext-Template). Mit den Korrekturen entfällt das:

- Preis: kommt aus `auftraggeber.stundensatzCents` (DB).
- Zeilenanzahl: beliebig (eine pro Behandlung).
- Einleitungstext: App-seitig als fester String mit Platzhaltern. Wenn er pro Auftraggeber variieren muss, kann das Feld `einleitungstext` von der Therapeutin in der Vorlage einfach komplett selbst formuliert werden — dann schreibt die App dort nur den **vorhandenen Default** nicht um und lässt das Feld stehen, oder (wenn das Feld leer ist) setzt den App-Default. Entscheidung: App erzeugt immer den Einleitungstext aus dem Template-String, überschreibt das Feld immer.

**Ergebnis**: Es gibt genau ein Artefakt pro Auftraggeber/global — die `briefvorlage.pdf`. Keine JSON-Config.

---

## 5. Template-Technologien — Vergleich

### 5.1 pdf-lib Overlay (aktuell)

- ✅ Keine zusätzliche Dependency, bereits in Verwendung.
- ❌ Positionen fest im Code; Therapeutin kann Briefkopf nicht „verschieben".
- ❌ Kein natürliches Feld-Modell.
- **Urteil**: reicht nicht.

### 5.2 AcroForm / ausfüllbare PDFs (mit pdf-lib) — **empfohlen**

- ✅ Felder sitzen in der Vorlage; Therapeutin kann sie in LibreOffice Draw / Adobe Acrobat / PDF-XChange platzieren.
- ✅ `pdf-lib` füllt AcroForm nativ (`PDFDocument.getForm()`, `form.getTextField(name).setText(…)`), inklusive Mehrzeiler (`setMultiline(true)`).
- ✅ `form.flatten()` erzeugt am Ende ein „festes" PDF ohne editierbare Felder.
- ✅ Keine weitere Dependency nötig.
- ❌ Keine native Tabellenwiederholung — lösen wir durch **code-gezeichnete Zeilen in einer durch `layout.ts` definierten Zone** (siehe §4.1).
- ❌ AcroForm-Felder haben feste Breite/Höhe — zu langer Text kann abgeschnitten werden. Mildern durch: ausreichend dimensionierte Felder und multiline-Textboxen, zusätzlich einen Längen-Check in der App mit Warnung beim Erzeugen.
- **Urteil (Empfehlung)**: Beste Kombination aus Pflegekomfort und Technik-Aufwand für dieses Projekt.

### 5.3 DOCX-Template + LibreOffice-Headless → PDF

- ✅ Therapeutin pflegt Word-Vorlage (aktueller Workflow).
- ❌ Braucht LibreOffice-Binary → Widerspruch zum Single-Binary-Ziel (PRD §5).
- **Urteil**: Deployment-Kröte, Alternative bleibt aber für später denkbar.

### 5.4 HTML + CSS + headless Chromium → PDF

- ✅ Mächtigstes Layout.
- ❌ Chromium-Dependency; Therapeutin kann HTML nicht pflegen.
- **Urteil**: nicht für dieses Projekt.

---

## 6. Empfohlener Ansatz (konkret)

**Weg: AcroForm-Felder in der Vorlage für alle festen Textstellen + code-gezeichnete Tabellenzeilen in einer markierten Zone, umgesetzt mit `pdf-lib`.**

### 6.1 Vorlagen-Artefakt

Pro Auftraggeber (oder global, mit Fallback wie heute in `templateResolver.ts`):

- **`briefvorlage.pdf`** (A4, 1 Seite): Briefkopf + Tabellenrahmen mit Spaltenkopf + Footer + AcroForm-Felder nach §4.2. Kein JSON, keine weiteren Assets.

Die heutige Hierarchie bleibt bestehen (`templateResolver.ts`): Auftraggeber-spezifisch → global → Fehler.

### 6.2 Render-Pipeline

1. `resolveTemplate(db, paths, 'rechnung', auftraggeberId)` → Pfad zu `briefvorlage.pdf` (unverändert).
2. `PDFDocument.load(templateBytes)` → `doc`.
3. `const form = doc.getForm()`.
4. AcroForm-Felder befüllen (siehe §4.2). Für jedes Feld: `form.getFieldMaybe(name)` — wenn vorhanden, `setText(value)`; wenn nicht, still überspringen.
5. Tabellenzone aus `layout.ts` einlesen (feste Koordinaten, siehe §4.1).
6. Pro Behandlung (sortiert nach Datum) eine Tabellenzeile zeichnen:
   - Position, Anzahl, Einheit, Bezeichnung, Einzelpreis, Gesamtpreis.
   - Zeilenhöhe fix (z. B. 16 pt).
   - Kein Zeilenumbruch innerhalb der Zelle — Bezeichnungen passen erfahrungsgemäß. Als Sicherheitsnetz: `wrapText`-Helfer (siehe §6.3) — falls Überlauf, wird die Zeile höher und folgende Zeilen verschieben sich.
7. `form.flatten()` → alle Felder werden in statischen Inhalt konvertiert, Dokument ist abgeschlossen.
8. `doc.save()` → Bytes schreiben nach `bills/<nummer>-<kindname>.pdf` (unverändert).

### 6.3 Optional: `wrapText`-Helfer

Reiner Absicherungs-Helfer, falls eine Bezeichnung mal länger wird als die Spalte. Implementierung: Wortweise durch `font.widthOfTextAtSize` messen, auf Wortgrenze umbrechen. Pro Tabellenzeile dann `lineCount * lineHeight` als Höhe. Im Regelfall (kurze Taetigkeit-Labels + Datum) bleibt es bei einer Zeile.

### 6.4 Seitenumbruch

Die Tabellenzone erlaubt in einer A4-Seite typischerweise 8–10 Datenzeilen. Wenn mehr Termine vorhanden sind:

- **Phase 1 (MVP)**: harte Obergrenze = Platz in der Zone; Überlauf ergibt eine klare Fehlermeldung („Mehr als N Termine — Seitenumbruch noch nicht implementiert. Bitte Vorlage anpassen oder mit Entwickler sprechen.") Das ist nicht elegant, deckt aber 99 % der Fälle ab.
- **Phase 2**: echte Paginierung — `doc.addPage()`, Kopfbereich-Duplikat mit Mini-Header („Rechnung Nr. XYZ — Fortsetzung"), Tabellenzone auf Folgeseite, Gesamtsumme erst auf letzter Seite. Kann später ergänzt werden.

Wir beginnen mit Phase 1.

### 6.5 Feld-Inventar (zusammengefasst)

Felder, die die App in die Vorlage schreibt:

- `empfaengerAdresse` ← formatiert aus `auftraggeber.*`
- `rechnungsnummer` ← `rechnungen.nummer`
- `rechnungsdatum` ← `rechnungen.rechnungsdatum` (vom Nutzer eingegeben, Default heute) formatiert als `DD.MM.YYYY`
- `leistungszeitraum` ← aus `(year, month)` formatiert als `01.MM.YYYY – letzter-Tag.MM.YYYY`
- `einleitungstext` ← App-seitig gebaut: `"Mein Honorar für die Teilmaßnahme ${THERAPIE_FORM_LABELS[therapie.form]} betrug im Monat ${monatName} ${year}:"`
- `kindTitel` ← `"${kind.vorname} ${kind.nachname} · ${kind.aktenzeichen} · im ${monatName} ${year}"`
- `gesamtsumme` ← `formatEuro(gesamtCents)`
- `unterschriftName` (optional) ← `"${kind.vorname} ${kind.nachname}"`

Tabellenzeilen pro Behandlung (kein AcroForm, sondern `drawText`):

- Pos (Index), `be`, „BE", `TAETIGKEIT_LABELS[behandlung.taetigkeit] ?? THERAPIE_FORM_LABELS[therapie.form]` + Datum, `formatEuro(stundensatzCents)`, `formatEuro(be * stundensatzCents)`

---

## 7. Migrationsplan (grobe Reihenfolge)

1. **Vorlage neu bauen**
   - Therapeutin legt `briefvorlage.pdf` in **PDF-XChange Editor** an mit den AcroForm-Feldern aus §4.2 (und einem gedruckten Tabellenrahmen an den Koordinaten, die `layout.ts` vorgibt).
   - Testvorlage unter `data/templates/` ablegen (`templateResolver.ts`-Konvention).

2. **DB-Migration**
   - Neues Feld `rechnungen.rechnungsdatum` (Timestamp, notNull) per Drizzle-Migration.
   - Backfill für Bestandsdaten: `UPDATE rechnungen SET rechnungsdatum = created_at WHERE rechnungsdatum IS NULL`, dann `NOT NULL` setzen.

3. **UI — Erzeugen-Dialog** (`apps/web/src/pages/RechnungCreatePage.tsx` bzw. `RechnungStore.ts`)
   - Neues Date-Feld „Rechnungsdatum" mit Vorbelegung = heute.
   - Wert wird an die `createMonatsrechnung`-Mutation durchgereicht.

4. **Schema/Mutation** (`apps/server/src/schema/mutations/rechnung.ts`, `services/rechnungService.ts`)
   - `CreateRechnungInput` um `rechnungsdatum: Date` erweitern.
   - `rechnungen.rechnungsdatum` beim Insert/Update setzen.
   - `RechnungPdfInput` um `rechnungsdatum: Date` und `monatName: string` erweitern.

5. **Renderer-Umbau** (`apps/server/src/pdf/rechnungPdf.ts`)
   - Statt `drawLines`/`drawText` für Briefkopf → AcroForm-Form-API nutzen (`doc.getForm().getTextField(name).setText(value)`, `setMultiline(true)` wo nötig).
   - Pipeline nach §6.2.
   - `layout.ts` auf Tabellenzonen-Koordinaten reduzieren.
   - `form.flatten()` am Ende.

6. **`templateResolver.ts`** bleibt unverändert — liefert weiter `briefvorlage.pdf`-Pfad, Hierarchie Auftraggeber → global.

7. **Tests**
   - Unit (`rechnungPdf.spec.ts` erweitern): mit einer Mini-AcroForm-Vorlage (fixture, z. B. `test-briefvorlage.pdf` in `apps/server/src/__tests__/pdf/fixtures/`) den Renderer laufen lassen, per `pdf-parse` Textinhalt extrahieren, prüfen: Empfängeradresse, Rechnungsnummer, Rechnungsdatum, Leistungszeitraum, Kindesname+Aktenzeichen (Titelzeile), Therapieform im Einleitungstext, Gesamtsumme, pro Behandlung eine Zeile mit Datum + Taetigkeit-Label.
   - E2E (`uc-3.2-rechnung.e2e.ts` ggf. erweitern): Rechnungsdatum-Feld vorbelegt = heute; nach Erzeugung PDF-Textinhalt auf Kind + Aktenzeichen + Anzahl Tabellenzeilen prüfen.

8. **PRD-Update**
   - §5 aktualisieren: Technologie-Entscheidung (AcroForm + pdf-lib) dokumentieren.
   - `PRDcorrections.md` §5 abhaken.

---

## 8. Entscheidungen (bestätigt)

Alle ursprünglich offenen Fragen sind geklärt:

1. **AcroForm-Pflege-Tool**: **PDF-XChange Editor**. Die Therapeutin pflegt damit `briefvorlage.pdf` und setzt die AcroForm-Felder nach dem Feld-Inventar aus §4.2.
2. **Einleitungstext**: Fester Template-String App-seitig: `"Mein Honorar für die Teilmaßnahme ${THERAPIE_FORM_LABELS[therapie.form]} betrug im Monat ${monatName} ${year}:"`. Keine Pflege in der Vorlage, keine pro-Auftraggeber-Variante.
3. **Rechnungsdatum**: Nutzer gibt es im Erzeugen-Dialog ein, **Vorbelegung = heute**. Neues DB-Feld `rechnungen.rechnungsdatum` (siehe §3.1 und §7 Schritt 2–4).
4. **Tabellenzone-Position**: **Variante X2** — feste Koordinaten in `layout.ts`. Vorlage und Code müssen sich bei den Tabellenrahmen-Koordinaten einig sein; eine Verschiebung braucht eine Code-Anpassung.

---

## 9. TL;DR

- **AcroForm-Felder in `briefvorlage.pdf`** für Empfängeradresse, Rechnungsnummer, Rechnungsdatum, Leistungszeitraum, Einleitungstext, Kindesname+Aktenzeichen (Titelzeile), Gesamtsumme. Pflege per PDF-XChange Editor.
- **Tabellenzeilen per Code gezeichnet** in einer Zone mit festen Koordinaten (`layout.ts`) — eine Zeile pro Behandlung, leere Zeilen bleiben leer, keine Gruppierung, ein Tarif je Template.
- **Eine DB-Migration**: `rechnungen.rechnungsdatum` (Nutzer-Eingabe, Default heute). Alle anderen Felder passen bereits.
- **Keine `template.json`** — Einleitungstext und Preisstruktur kommen aus App-Code bzw. DB.
- **Phase 1** unterstützt so viele Termine, wie in die Tabellenzone passen (~8–10). Seitenumbruch in Phase 2.
