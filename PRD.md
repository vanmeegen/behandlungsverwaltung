# PRD: Behandlungsverwaltung

## 1. Zweck & Nutzerin

Die Therapeutin (Einzelnutzerin, keine Mehrbenutzer-Verwaltung) soll
**auf dem Handy** sehr schnell Behandlungen eintragen und am Monatsende
**pro Kind und Auftraggeber eine Rechnung als PDF** erzeugen können.
Die App läuft **lokal** auf ihrem Gerät, **offline-fähig** (PWA),
ohne Cloud. Alle Daten bleiben auf ihrem Gerät.

## 2. Stammdaten

**Adressregel (entitätsübergreifend):** Wo eine Adresse erfasst wird,
ist **PLZ immer Pflicht** — sowohl beim Kind als auch beim
Auftraggeber. Die PLZ darf in keinem Fall leer gespeichert werden.

### 2.1 Kind

- Vorname, Nachname, Geburtsdatum
- Adresse: Straße, Hausnummer, **PLZ (Pflicht)**, Stadt
- Aktenzeichen (interne Kennung, z. B. für interne Akten;
  **nicht** Teil der Rechnungsnummer)

### 2.2 Auftraggeber

- Typ: **Firma** oder **Person**
- Firmenname (bei Firma) _oder_ Vorname + Nachname (bei Person)
- Adresse: Straße, Hausnummer, **PLZ (Pflicht)**, Stadt
- Stundensatz (Euro pro Behandlungseinheit)

### 2.3 Therapie (Zuordnung Kind ↔ Auftraggeber)

- Kind, Auftraggeber
- Therapieform (Auswahl):
  Dyskalkulietherapie · Lerntherapie · Heilpädagogik ·
  Elternberatung · **Sonstiges**
- Kommentarfeld (nur bei „Sonstiges", dann Pflicht)
- Gesamtzahl bewilligter Behandlungseinheiten
- Arbeitsthema (optional): dient als **Vorbelegung** für das
  Arbeitsthema jeder daraus erfassten Behandlung (§2.4).

### 2.4 Behandlung (zuvor „Termin", wird durchgängig **Behandlung** genannt)

- Therapie (daraus ergeben sich Kind und Auftraggeber automatisch)
- Datum
- **Behandlungseinheiten (BE)** — **nie in Stunden**, immer als Anzahl BE
- Hinweis: das konkret geleistete Arbeitsthema wird **gespeichert**, wird aber von der Therapie als Vorbelegung übernommen

## 3. Kernabläufe

### 3.1 Behandlung erfassen (Handy-Schnellerfassung)

In wenigen Taps: Kind auswählen → Therapie → BE (Stepper) → Datum
(Vorbelegung: heute) → Speichern.

### 3.2 Monatsrechnung erstellen

Therapeutin wählt Monat, Kind und Auftraggeber. Das System

- sammelt alle Behandlungen dieses Kinds für diesen Auftraggeber im Monat,
- erzeugt **eine Rechnung** mit einer Zeile pro Behandlung
  (Datum · Arbeitsthema · BE · Einzelpreis · Gesamt),
- vergibt die Rechnungsnummer (Abschnitt 4),
- erzeugt die PDF (siehe Abschnitt 5) und legt sie als Datei im Ordner
  `~/.behandlungsverwaltung/bills/` unter dem Dateinamen
  `YYYY-MM-NNNN-<Name Kind>.pdf` ab (Jahr, Monat und laufende Nummer gemäß
  Abschnitt 4; Beispiel: `2026-04-0001.pdf`).

### 3.3 Stundennachweis drucken

Therapeutin wählt Kind, Auftraggeber und Monat. Das System erzeugt ein
**Blanko-Formular** mit vorausgefülltem Kopf (Kind, Auftraggeber, Monat)
und einer Tabelle mit leeren Zeilen. Spalten der Tabelle:

| Datum | BE | Leistung | Unterschrift |

Die Zeilen werden **vor Ort handschriftlich** ausgefüllt.
Der Stundennachweis teilt sich die Rechnungsnummer mit der Rechnung
desselben Abrechnungsmonats. Die Datei wird unter
`~/.behandlungsverwaltung/timesheets/` als
`YYYY-MM-NNNN-<Kindesname>.pdf` abgelegt
(Jahr, Monat und laufende Nummer gemäß Abschnitt 4; Beispiel:
`2026-04-0001-Anna_
Musterfrau.pdf`).
Der `<Kindesname>` wird als `Vorname_Nachname` eingesetzt,
Sonderzeichen werden entfernt.

### 3.4 Rechnungsübersicht

Liste aller erzeugten Rechnungen (filterbar nach Kind / Monat /
Auftraggeber), mit Download der jeweiligen PDF.

### 3.5 Kind erfassen

Therapeutin öffnet die Kinderliste und legt über „Neu" ein Kind an
(Vorname, Nachname, Geburtsdatum, Adresse inkl. **Pflicht-PLZ**,
Aktenzeichen). Nach dem Speichern erscheint das Kind in der Liste und
steht als Auswahl in Therapie- und Behandlungserfassung zur Verfügung.

### 3.6 Auftraggeber erfassen

Therapeutin öffnet die Auftraggeberliste und legt über „Neu" einen
Auftraggeber an. Der Typ wird zuerst gewählt (**Firma** oder
**Person**); das Formular zeigt daraufhin entweder Firmenname oder
Vor-/Nachname. Adresse (inkl. **Pflicht-PLZ**) und Stundensatz sind
Pflicht. Nach dem Speichern erscheint der Auftraggeber in der Liste
und in der Therapie-Zuordnung.

### 3.7 Therapie erfassen

Therapeutin öffnet die Therapieliste und legt über „Neu" eine
Therapie an: wählt ein bereits erfasstes Kind und einen bereits
erfassten Auftraggeber, wählt die Therapieform (bei **Sonstiges** ist
das Kommentarfeld Pflicht) und erfasst die Gesamtzahl bewilligter
Behandlungseinheiten. Nach dem Speichern erscheint die Therapie
sowohl unter der Detailansicht des Kindes als auch unter der des
Auftraggebers.

## 4. Rechnungsnummer

Format: **`YYYY-MM-NNNN`**

- `YYYY` = vierstellige Jahreszahl der Rechnung
- `MM` = zweistelliger Abrechnungsmonat (`01`–`12`) — **immer Teil der
  Rechnungsnummer**
- `NNNN` = vierstellige laufende Nummer **innerhalb des Jahres**
  (über alle Monate, Kinder und Auftraggeber hinweg). Der Zähler
  startet am Jahresanfang bei `0001` und wird ausschließlich **jährlich**
  zurückgesetzt — nicht pro Monat.

Beispiele (Jahr 2026):

- Erste Rechnung im April 2026 → `2026-04-0001`
- Zweite Rechnung im April 2026 → `2026-04-0002`
- Nächste Rechnung (erste im Mai 2026) → `2026-05-0003`
- Nächste Rechnung (reset bei neuem Jahr) → `2027-01-0001`

Die Nummer wird beim Erzeugen der Rechnung fest vergeben und bleibt
unveränderlich. Der zugehörige Stundennachweis übernimmt dieselbe
Rechnungsnummer und ergänzt den Kindesnamen im Dateinamen
(siehe 3.3).

## 5. PDF-Vorlagen

Die Therapeutin hinterlegt eigene PDF-Vorlagen mit ihrem Briefkopf.

- **Eine Vorlage pro Auftraggeber** (optional, falls gewünscht)
- **Eine globale Fallback-Vorlage**, wenn ein Auftraggeber keine eigene hat
- Je **Vorlagen-Typ** getrennt: eine für **Rechnung**, eine für
  **Stundennachweis**

Die App zeichnet Rechnungskopf, Adressblock und Tabelle in einen
**festen Bereich unterhalb des Briefkopfs** der Vorlage.

**Speicherort der Vorlagen:** Die PDF-Vorlagen werden **als Dateien** in
einem Verzeichnis `templates/` **neben der Datenbankdatei** abgelegt
(nicht in der Datenbank). Die Therapeutin kann die Vorlagen dort
notfalls auch direkt austauschen.

**Speicherort der erzeugten PDFs:** Fertig erzeugte Rechnungen werden
im Verzeichnis `bills/`, Stundennachweise im Verzeichnis `timesheets/`
**neben der Datenbankdatei** abgelegt (siehe 3.2 und 3.3). So kann die
Therapeutin einfach im Dateisystem auf alle Belege zugreifen und sie
z. B. direkt per E-Mail oder Druck weiterverarbeiten.

## 6. Umsatzsteuer

Heilbehandlungsleistungen sind **umsatzsteuerfrei** (§ 4 UStG). Die
Rechnung enthält einen entsprechenden **Hinweistext**, keinen
USt-Ausweis. Brutto = Netto.

## 7. Nicht-funktionale Anforderungen

- **Mobile-first UI**, bedienbar auf dem Handy, als PWA installierbar
- **Offline-fähig** (lokale Daten, keine Cloud)
- **Einzelbinary** für Windows / macOS / Linux
- **Speicherort**: Datenbank sowie die Ordner `templates/` (Vorlagen),
  `bills/` (erzeugte Rechnungen) und `timesheets/` (erzeugte
  Stundennachweise) im Home-Verzeichnis der Nutzerin:
  - `~/.behandlungsverwaltung/app.db`
  - `~/.behandlungsverwaltung/templates/`
  - `~/.behandlungsverwaltung/bills/`
  - `~/.behandlungsverwaltung/timesheets/`

## 8. Nicht im Umfang (v1)

- Mehrbenutzer / Anmeldung
- Zahlungsstatus-Tracking, Mahnwesen
- E-Mail-Versand der Rechnungen
- Backup-/Restore-Assistent (Nutzerin kann den Ordner selbst sichern)

## 9. Akzeptanzkriterien (BDD)

Jedes Kriterium ist als `[unit]` (isolierte Fachlogik-Prüfung) oder
`[e2e]` (durchgängiger Ablauf im Browser) markiert. Die Liste dient als
Testgrundlage (TDD).

### Kind

- **AC-KIND-01** `[e2e]` Given leere Kindliste, When Therapeutin ein
  Kind mit allen Pflichtfeldern anlegt, Then erscheint es in der Liste.
- **AC-KIND-02** `[unit]` Given ein Kind ohne PLZ, When gespeichert wird,
  Then kommt Validierungsfehler „PLZ ist Pflicht".
- **AC-KIND-03** `[e2e]` Given ein Kind existiert, When Therapeutin es
  bearbeitet und speichert, Then werden die Änderungen angezeigt.

### Auftraggeber

- **AC-AG-01** `[e2e]` Given leere Auftraggeberliste, When ein neuer
  Auftraggeber vom Typ Firma angelegt wird, Then wird Firmenname
  angezeigt, Vorname/Nachname sind leer.
- **AC-AG-02** `[unit]` Given Typ = Person, When ohne Vor- oder
  Nachname gespeichert, Then Validierungsfehler.
- **AC-AG-03** `[unit]` Given ein Auftraggeber ohne PLZ, Then
  Validierungsfehler „PLZ ist Pflicht".

### Therapie

- **AC-TH-01** `[unit]` Given Therapieform = Sonstiges, When ohne
  Kommentar gespeichert, Then Fehler „Kommentar ist Pflicht bei
  Sonstiges".
- **AC-TH-02** `[e2e]` Given Kind und Auftraggeber existieren, When
  Therapeutin eine Therapie anlegt, Then erscheint sie unter beiden
  referenzierten Datensätzen.

### Behandlung

- **AC-BEH-01** `[e2e]` Given eine Therapie existiert, When
  Therapeutin auf dem Handy eine Behandlung mit 2 BE für heute
  einträgt, Then erscheint sie in der Liste der Behandlungen dieser
  Therapie.
- **AC-BEH-02** `[unit]` Given BE = 0, Then Validierungsfehler
  („BE muss ≥ 1 sein").
- **AC-BEH-03** `[unit]` Given eine Therapie hat ein Arbeitsthema
  hinterlegt, When eine neue Behandlung für diese Therapie erfasst
  wird, Then ist das Feld „Arbeitsthema" im Erfassungsformular mit
  dem Therapie-Arbeitsthema **vorbelegt** und kann von der
  Therapeutin pro Behandlung überschrieben werden.

### Rechnung

- **AC-RECH-01** `[e2e]` Given Behandlungen im April 2026 für Kind K
  und Auftraggeber A, When „Rechnung April 2026" erstellt wird, Then
  wird ein PDF erzeugt mit je einer Zeile pro Behandlung und
  korrekter Gesamtsumme.
- **AC-RECH-02** `[unit]` Given Stundensatz 45,00 € und Behandlung mit
  3 BE, Then Zeilenbetrag = 135,00 €.
- **AC-RECH-03** `[unit]` Given es existiert noch keine Rechnung im
  Jahr 2026 und die erste Rechnung des Jahres wird im April 2026
  erzeugt, Then erhält sie die Nummer `2026-04-0001`.
- **AC-RECH-04** `[unit]` Given im Jahr 2026 existieren bereits
  `2026-04-0001` und `2026-04-0002`, When die nächste Rechnung im
  Mai 2026 erzeugt wird, Then erhält sie die Nummer `2026-05-0003`
  (Zähler läuft jahresweise, nicht monatsweise).
- **AC-RECH-05** `[e2e]` Given eine Rechnung wurde erzeugt, When die
  Therapeutin sie erneut für denselben Monat anstoßen möchte, Then
  warnt das System vor einem Duplikat.
- **AC-RECH-06** `[unit]` Given Auftraggeber A hat eine eigene
  Rechnungsvorlage hinterlegt, Then wird diese verwendet.
- **AC-RECH-07** `[unit]` Given Auftraggeber A hat keine eigene
  Vorlage, aber eine globale Rechnungs-Fallback-Vorlage existiert,
  Then wird die globale Vorlage verwendet.
- **AC-RECH-08** `[unit]` Given gültige Rechnungsdaten, Then enthält
  das PDF den USt-Befreiungshinweis und **keinen** USt-Ausweis.
- **AC-RECH-09** `[e2e]` Given eine Rechnung wird für Kind „Anna
  Musterfrau" erzeugt, Then liegt die Datei unter
  `~/.behandlungsverwaltung/bills/` mit Dateinamen im Format
  `YYYY-MM-NNNN-<Vorname_Nachname>.pdf`
  (z. B. `2026-04-0001-Anna_Musterfrau.pdf`).

### Stundennachweis

- **AC-STD-01** `[e2e]` Given Kind, Auftraggeber, Monat gewählt, When
  „Stundennachweis drucken" geklickt, Then wird ein PDF mit
  vorausgefülltem Kopf und leerer Tabelle erzeugt und in
  `~/.behandlungsverwaltung/timesheets/` abgelegt.
- **AC-STD-02** `[unit]` Given die erzeugte Stundennachweis-PDF, Then
  besitzt die Tabelle genau die Spalten **Datum · BE · Leistung ·
  Unterschrift** in dieser Reihenfolge.
- **AC-STD-03** `[unit]` Given es existiert eine Stundennachweis-
  Vorlage für den gewählten Auftraggeber, Then wird diese verwendet,
  sonst die globale Fallback-Vorlage.
- **AC-STD-04** `[unit]` Given die Rechnungsnummer `2026-04-0001` und
  das Kind „Anna Musterfrau", Then hat die Stundennachweis-Datei den
  Namen `2026-04-0001-Anna_Musterfrau.pdf`.

### PDF-Vorlagen-Verwaltung

- **AC-TPL-01** `[e2e]` Given ein PDF wird als Vorlage für einen
  Auftraggeber hochgeladen, Then liegt die Datei im Ordner
  `~/.behandlungsverwaltung/templates/` und wird künftig für dessen
  Rechnungen verwendet.
- **AC-TPL-02** `[unit]` Given ein Vorlagendatei wird manuell im
  `templates/`-Ordner ersetzt, Then verwendet die nächste
  Rechnungserzeugung die neue Datei (keine DB-Kopie).

### Speicherung

- **AC-SYS-01** `[e2e]` Given frischer Start der App, Then entstehen
  `~/.behandlungsverwaltung/app.db`,
  `~/.behandlungsverwaltung/templates/` und
  `~/.behandlungsverwaltung/bills/`, falls nicht vorhanden.

## 10. End-to-End Use-Case-Szenarien (Gherkin)

Die folgenden sieben Gherkin-Features spezifizieren die vollständigen
Benutzerreisen durch die UI. Jedes Feature bildet **eine** Playwright-
E2E-Spec-Datei (`apps/web/e2e/uc-<n>-*.e2e.ts`). Sie ergänzen die
feingranularen Akzeptanzkriterien aus Abschnitt 9; bei Widersprüchen
haben die Szenarien hier Vorrang (sie sind näher an der UI).

Konventionen:

- Gherkin-Schlüsselwörter (Feature / Scenario / Given / When / Then /
  And) in Englisch, Fachinhalt auf Deutsch — passend zur UI.
- `Background` spezifiziert Daten, die durch einen GraphQL-Seed-Helper
  (`apps/web/e2e/helpers/seed.ts`) direkt in die isolierte Test-DB
  geschrieben werden; die UI-Schritte (`When` / `Then`) prüfen
  ausschließlich den UI-Pfad.
- „Stammdaten-Use-Cases" 3.5 – 3.7 starten bewusst mit leeren Listen,
  um auch den Leer-Zustand der UI zu verifizieren.

### UC-3.1 Behandlung per Handy-Schnellerfassung erfassen

```gherkin
Feature: Behandlung per Handy-Schnellerfassung aufzeichnen
  Als Therapeutin
  möchte ich eine Behandlung mit wenigen Taps auf dem Handy erfassen
  damit das Protokollieren direkt nach der Sitzung reibungslos ist

  Background:
    Given ein Kind „Anna Musterfrau" existiert
    And ein Auftraggeber „Jugendamt Köln" existiert
    And eine Therapie „Lerntherapie" verknüpft „Anna Musterfrau" und „Jugendamt Köln"

  Scenario: 2 BE für heute mit der Schnellerfassung speichern
    Given ich öffne die Schnellerfassung auf einem 390×844-Viewport
    When ich „Anna Musterfrau" als Kind auswähle
    And ich die Therapie „Lerntherapie" auswähle
    And ich BE auf 2 setze
    And ich das vorbelegte Datum (heute) unverändert lasse
    And ich das aus der Therapie vorbelegte Arbeitsthema unverändert lasse
    And ich „Speichern" antippe
    Then sehe ich die Bestätigung „Behandlung gespeichert"
    And die Behandlungsliste der Therapie „Lerntherapie" enthält einen Eintrag mit heutigem Datum und „2 BE"
```

### UC-3.2 Monatsrechnung als PDF erzeugen

```gherkin
Feature: Monatsrechnung als PDF erzeugen
  Als Therapeutin
  möchte ich am Monatsende je Kind und Auftraggeber eine Rechnung erzeugen
  damit ich die geleisteten Behandlungen abrechnen kann

  Background:
    Given ein Kind „Anna Musterfrau" existiert
    And ein Auftraggeber „Jugendamt Köln" mit Stundensatz 45,00 € existiert
    And eine Therapie „Lerntherapie" verknüpft die beiden
    And im April 2026 wurden drei Behandlungen mit je 2 BE erfasst
    And eine globale Rechnungsvorlage ist hochgeladen

  Scenario: Rechnung für April 2026 erzeugen
    Given ich öffne die Seite „Rechnung erstellen"
    When ich Monat „April 2026" wähle
    And ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    And ich „Rechnung erzeugen" antippe
    Then sehe ich die Bestätigung „Rechnung erstellt: 2026-04-0001"
    And die Datei „2026-04-0001-Anna_Musterfrau.pdf" liegt im Ordner „bills/"
    And die Rechnungsübersicht zeigt eine Zeile mit Nummer „2026-04-0001" und Gesamtsumme „270,00 €"

  Scenario: Doppelte Rechnung wird verhindert
    Given für April 2026, Kind „Anna Musterfrau", Auftraggeber „Jugendamt Köln" existiert bereits die Rechnung „2026-04-0001"
    When ich erneut „Rechnung erzeugen" für denselben Monat, dasselbe Kind und denselben Auftraggeber antippe
    Then erscheint der Warnhinweis „Für diesen Monat wurde bereits eine Rechnung erzeugt."
    And es wird keine zweite Rechnung erzeugt
```

### UC-3.3 Stundennachweis als Blanko-PDF drucken

```gherkin
Feature: Blanko-Stundennachweis als PDF erzeugen
  Als Therapeutin
  möchte ich zu einer Monatsrechnung ein leeres Stundennachweis-Formular erzeugen
  damit ich es vor Ort handschriftlich ausfüllen und unterzeichnen lassen kann

  Background:
    Given ein Kind „Anna Musterfrau" existiert
    And ein Auftraggeber „Jugendamt Köln" existiert
    And die Rechnung „2026-04-0001" für April 2026 wurde bereits erzeugt
    And eine globale Stundennachweis-Vorlage ist hochgeladen

  Scenario: Stundennachweis für April 2026 erzeugen
    Given ich öffne die Seite „Stundennachweis"
    When ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    And ich Monat „April 2026" wähle
    And ich „Stundennachweis drucken" antippe
    Then sehe ich die Bestätigung „Stundennachweis erstellt"
    And die Datei „2026-04-0001-Anna_Musterfrau.pdf" liegt im Ordner „timesheets/"
    And die Tabelle im PDF hat die Spalten „Datum · BE · Leistung · Unterschrift" in dieser Reihenfolge
    And die Tabellenzeilen sind leer
```

### UC-3.4 Rechnungsübersicht filtern und PDF herunterladen

```gherkin
Feature: Rechnungen filtern und PDF herunterladen
  Als Therapeutin
  möchte ich meine erzeugten Rechnungen gezielt finden und öffnen
  damit ich sie per E-Mail versenden oder ausdrucken kann

  Background:
    Given die Rechnung „2026-04-0001" für Kind „Anna Musterfrau" existiert
    And die Rechnung „2026-04-0002" für Kind „Ben Beispiel" existiert
    And die Rechnung „2026-05-0003" für Kind „Anna Musterfrau" existiert

  Scenario: Rechnungen eines Kindes anzeigen und PDF öffnen
    Given ich öffne die Rechnungsübersicht
    When ich den Filter „Kind" auf „Anna Musterfrau" setze
    Then sehe ich genau zwei Zeilen mit den Nummern „2026-04-0001" und „2026-05-0003"
    When ich bei „2026-04-0001" auf „PDF" tippe
    Then wird die Datei „2026-04-0001-Anna_Musterfrau.pdf" heruntergeladen
    And der Download ist nicht leer
```

### UC-3.5 Kind erfassen

```gherkin
Feature: Ein neues Kind anlegen
  Als Therapeutin
  möchte ich ein Kind mit allen Stammdaten anlegen
  damit ich später Therapien und Behandlungen darauf buchen kann

  Background:
    Given die Kinderliste ist leer

  Scenario: Kind vollständig anlegen
    Given ich öffne die Kinderliste
    When ich auf „Neu" tippe
    And ich Vorname „Anna" eingebe
    And ich Nachname „Musterfrau" eingebe
    And ich Geburtsdatum „2018-03-14" eingebe
    And ich Straße „Hauptstr." und Hausnummer „12" eingebe
    And ich PLZ „50667" und Stadt „Köln" eingebe
    And ich Aktenzeichen „K-2026-001" eingebe
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Kind gespeichert"
    And die Kinderliste enthält eine Zeile „Musterfrau, Anna"

  Scenario: Kind ohne PLZ wird nicht gespeichert
    Given ich bin im „Neu"-Formular für ein Kind und habe alles außer der PLZ ausgefüllt
    When ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „PLZ ist Pflicht"
    And die Kinderliste bleibt leer
```

### UC-3.6 Auftraggeber erfassen

```gherkin
Feature: Einen neuen Auftraggeber anlegen
  Als Therapeutin
  möchte ich einen Auftraggeber (Firma oder Person) mit Adresse und Stundensatz erfassen
  damit ich Therapien und spätere Rechnungen darauf beziehen kann

  Background:
    Given die Auftraggeberliste ist leer

  Scenario: Auftraggeber vom Typ Firma anlegen
    Given ich öffne die Auftraggeberliste
    When ich auf „Neu" tippe
    And ich Typ „Firma" wähle
    And ich Firmenname „Jugendamt Köln" eingebe
    And ich Straße „Kalker Hauptstr." und Hausnummer „247-273" eingebe
    And ich PLZ „51103" und Stadt „Köln" eingebe
    And ich Stundensatz „45,00" eingebe
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Auftraggeber gespeichert"
    And die Auftraggeberliste enthält eine Zeile mit Firmenname „Jugendamt Köln"
    And in der Detailansicht sind Vorname und Nachname nicht befüllt

  Scenario: Person ohne Namen wird nicht gespeichert
    Given ich bin im „Neu"-Formular für einen Auftraggeber
    When ich Typ „Person" wähle
    And ich PLZ „50667" und Stundensatz „45,00" eingebe
    And ich Vorname und Nachname leer lasse
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Vor- und Nachname Pflicht"
    And die Auftraggeberliste bleibt leer
```

### UC-3.7 Therapie erfassen

```gherkin
Feature: Eine Therapie zwischen Kind und Auftraggeber anlegen
  Als Therapeutin
  möchte ich eine Therapie einem Kind und einem Auftraggeber zuordnen
  damit ich darauf Behandlungen erfassen und später abrechnen kann

  Background:
    Given ein Kind „Anna Musterfrau" existiert
    And ein Auftraggeber „Jugendamt Köln" existiert
    And die Therapieliste ist leer

  Scenario: Lerntherapie mit 60 bewilligten BE anlegen
    Given ich öffne die Therapieliste
    When ich auf „Neu" tippe
    And ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    And ich Therapieform „Lerntherapie" wähle
    And ich 60 als Gesamtzahl bewilligter Behandlungseinheiten eingebe
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Therapie gespeichert"
    And die Therapie erscheint in der Detailansicht von „Anna Musterfrau"
    And die Therapie erscheint in der Detailansicht von „Jugendamt Köln"

  Scenario: Therapieform „Sonstiges" ohne Kommentar wird abgelehnt
    Given ich bin im „Neu"-Formular für eine Therapie
    When ich Kind „Anna Musterfrau" und Auftraggeber „Jugendamt Köln" wähle
    And ich Therapieform „Sonstiges" wähle
    And ich das Kommentarfeld leer lasse
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Kommentar ist Pflicht bei Sonstiges"
    And die Therapieliste bleibt leer
```

### Zuordnung UC → Akzeptanzkriterien (Abschnitt 9)

| Use Case | deckt AC                           | ergänzt (neu durch UC spezifiziert)                |
| -------- | ---------------------------------- | -------------------------------------------------- |
| UC-3.1   | AC-BEH-01                          | Arbeitsthema-Vorbelegung aus Therapie (§2.4, §3.1) |
| UC-3.2   | AC-RECH-01, AC-RECH-05, AC-RECH-09 | Dateiname-Format mit Kindesnamen (§3.2)            |
| UC-3.3   | AC-STD-01, AC-STD-02, AC-STD-04    | Ablage in `timesheets/` statt `bills/` (§3.3)      |
| UC-3.4   | —                                  | Filter- und Download-Flow aus §3.4                 |
| UC-3.5   | AC-KIND-01, AC-KIND-02             | —                                                  |
| UC-3.6   | AC-AG-01, AC-AG-02                 | —                                                  |
| UC-3.7   | AC-TH-01, AC-TH-02                 | —                                                  |
