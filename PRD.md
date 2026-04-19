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
- Firmenname (bei Firma) *oder* Vorname + Nachname (bei Person)
- Adresse: Straße, Hausnummer, **PLZ (Pflicht)**, Stadt
- Stundensatz (Euro pro Behandlungseinheit)

### 2.3 Therapie (Zuordnung Kind ↔ Auftraggeber)
- Kind, Auftraggeber
- Therapieform (Auswahl):
  Dyskalkulietherapie · Lerntherapie · Heilpädagogik ·
  Elternberatung · **Sonstiges**
- Kommentarfeld (nur bei „Sonstiges", dann Pflicht)
- Gesamtzahl bewilligter Behandlungseinheiten

### 2.4 Behandlung (zuvor „Termin", wird durchgängig **Behandlung** genannt)
- Therapie (daraus ergeben sich Kind und Auftraggeber automatisch)
- Datum
- **Behandlungseinheiten (BE)** — **nie in Stunden**, immer als Anzahl BE
- Hinweis: das konkret geleistete Arbeitsthema wird **nicht gespeichert**
  (Vereinfachung: die Therapieform der übergeordneten Therapie reicht
  für die Abrechnung; detaillierte Leistungen werden, falls gewünscht,
  handschriftlich auf dem Stundennachweis ergänzt)

## 3. Kernabläufe

### 3.1 Behandlung erfassen (Handy-Schnellerfassung)
In wenigen Taps: Kind auswählen → Therapie → BE (Stepper) → Datum
(Standard: heute) → Speichern.

### 3.2 Monatsrechnung erstellen
Therapeutin wählt Monat, Kind und Auftraggeber. Das System
- sammelt alle Behandlungen dieses Kinds für diesen Auftraggeber im Monat,
- erzeugt **eine Rechnung** mit einer Zeile pro Behandlung
  (Datum · BE · Einzelpreis · Gesamt),
- vergibt die Rechnungsnummer (Abschnitt 4),
- erzeugt die PDF (siehe Abschnitt 5) und legt sie als Datei im Ordner
  `~/.behandlungsverwaltung/bills/` unter dem Dateinamen
  `YYYY-MM-NNNN.pdf` ab (Jahr, Monat und laufende Nummer gemäß
  Abschnitt 4; Beispiel: `2026-04-0001.pdf`).

### 3.3 Stundennachweis drucken
Therapeutin wählt Kind, Auftraggeber und Monat. Das System erzeugt ein
**Blanko-Formular** mit vorausgefülltem Kopf (Kind, Auftraggeber, Monat)
und einer Tabelle mit leeren Zeilen. Spalten der Tabelle:

| Datum | BE | Leistung | Unterschrift |

Die Zeilen werden **vor Ort handschriftlich** ausgefüllt.
Der Stundennachweis teilt sich die Rechnungsnummer mit der Rechnung
desselben Abrechnungsmonats. Die Datei wird unter
`~/.behandlungsverwaltung/bills/` als
`YYYY-MM-NNNN-<Kindesname>.pdf` abgelegt
(Jahr, Monat und laufende Nummer gemäß Abschnitt 4; Beispiel:
`2026-04-0001-Anna_Musterfrau.pdf`).
Der `<Kindesname>` wird als `Vorname_Nachname` eingesetzt,
Sonderzeichen werden entfernt.

### 3.4 Rechnungsübersicht
Liste aller erzeugten Rechnungen (filterbar nach Kind / Monat /
Auftraggeber), mit Download der jeweiligen PDF.

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

**Speicherort der erzeugten PDFs:** Fertig erzeugte Rechnungen und
Stundennachweise werden als Dateien in einem Verzeichnis `bills/`
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
- **Speicherort**: Datenbank sowie die Ordner `templates/` (Vorlagen)
  und `bills/` (erzeugte Rechnungen und Stundennachweise) im
  Home-Verzeichnis der Nutzerin:
  - `~/.behandlungsverwaltung/app.db`
  - `~/.behandlungsverwaltung/templates/`
  - `~/.behandlungsverwaltung/bills/`

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
- **AC-BEH-03** `[unit]` Given das Erfassungsformular, Then gibt es
  **kein Eingabefeld für geleistete Arbeit** (wird nicht persistiert).

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
- **AC-RECH-09** `[e2e]` Given eine Rechnung wird erzeugt, Then liegt
  die Datei unter `~/.behandlungsverwaltung/bills/` mit Dateinamen
  im Format `YYYY-MM-NNNN.pdf` (z. B. `2026-04-0001.pdf`).

### Stundennachweis
- **AC-STD-01** `[e2e]` Given Kind, Auftraggeber, Monat gewählt, When
  „Stundennachweis drucken" geklickt, Then wird ein PDF mit
  vorausgefülltem Kopf und leerer Tabelle erzeugt und in
  `~/.behandlungsverwaltung/bills/` abgelegt.
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
