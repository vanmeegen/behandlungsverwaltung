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
- **Erziehungsberechtigte (0 – 2)** — Beziehung zu §2.5; pro Kind
  können null, ein oder zwei Erziehungsberechtigte hinterlegt werden.

### 2.2 Auftraggeber

- Typ: **Firma** oder **Person**
- Firmenname (bei Firma) _oder_ Vorname + Nachname (bei Person)
- **Abteilung** (nur bei Firma, **optional**) — wird im
  Anschriftsblock der Rechnung zusätzlich zum Firmennamen ausgegeben
- Adresse: Straße, Hausnummer, **PLZ (Pflicht)**, Stadt
- Stundensatz (Euro pro Behandlungseinheit) — Standard-Stundensatz für
  **Einzeltherapie**
- **Gruppentherapie-Stundensätze (optional)** — für Gruppen mit 1 bis
  4 Kindern werden je Gruppengröße zwei Werte erfasst:
  - **Prozentsatz** (`%`) — Anteil des Stundensatzes, mit dem ein Kind
    in einer Gruppe dieser Größe berechnet wird
  - **Stundensatz** (`€/BE`) — alternativ direkt der pro Kind in einer
    Gruppe dieser Größe abgerechnete Eurobetrag

  Damit ergeben sich **acht Felder** pro Auftraggeber
  (`gruppe1Prozent`, `gruppe1Stundensatz`, `gruppe2Prozent`,
  `gruppe2Stundensatz`, `gruppe3Prozent`, `gruppe3Stundensatz`,
  `gruppe4Prozent`, `gruppe4Stundensatz`), **alle optional**, in der
  Datenbank **denormalisiert direkt am Auftraggeber** abgelegt (keine
  separate Tabelle).

- **Rechnungskopf-Text** (mehrzeilig, Pflicht) — frei formulierbarer
  Einleitungstext der Rechnung pro Auftraggeber. Ersetzt den bisher
  fest verdrahteten Satz („Mein Honorar für die Teilmaßnahme …")
  **vollständig**; die Therapeutin formuliert den Text exakt so,
  wie er auf der Rechnung erscheinen soll. Es gibt **keine
  Platzhalter** — der Text wird unverändert übernommen.

### 2.3 Therapie (Zuordnung Kind ↔ Auftraggeber)

- Kind, Auftraggeber
- Therapieform (Auswahl):
  Dyskalkulie-Therapie · Lern-Therapie · Legasthenie-Therapie ·
  Resilienztraining · Heilpädagogik · Elternberatung ·
  **Sonstiges**
- Kommentarfeld (nur bei „Sonstiges", dann Pflicht)
- **Startdatum** (Pflicht) — Datum, ab dem die Therapie läuft. Dient
  als **Untergrenze** für jede Behandlung dieser Therapie: das Datum
  einer Behandlung muss **≥ Startdatum** sein, sonst Validierungsfehler
  (§2.4).
- Gesamtzahl bewilligter Behandlungseinheiten
- **Gruppentherapie** (Checkbox, Default: **false**) — kennzeichnet
  die Therapie als Gruppentherapie und dient als **Vorbelegung** für
  jede daraus erfasste Behandlung (§2.4).
- Tätigkeit (optional): dient als **Vorbelegung** für die
  Tätigkeit jeder daraus erfassten Behandlung (§2.4). Auswahlwerte
  sind **alle Therapieformen** (oben) **plus** Elterngespräch ·
  Lehrergespräch · Bericht · Förderplan · Teamberatung.

### 2.4 Behandlung (zuvor „Termin", wird durchgängig **Behandlung** genannt)

- Therapie (daraus ergeben sich Kind und Auftraggeber automatisch)
- Datum — Validierung: **≥ Startdatum** der zugeordneten Therapie
  (§2.3); andernfalls Fehler „Datum liegt vor dem Startdatum der
  Therapie".
- **Behandlungseinheiten (BE)** — **nie in Stunden**, immer als Anzahl BE
- **Tätigkeit** (Pflicht, Auswahl aus demselben Enum wie §2.3):
  wird pro Behandlung **gespeichert** und in der Eingabemaske aus der
  Tätigkeit der Therapie **vorbelegt**; die Therapeutin kann den Wert
  pro Behandlung überschreiben.
- **Sonstiges-Freitext** — wenn die Tätigkeit auf **„Sonstiges"**
  steht, erscheint in der Eingabemaske **zusätzlich** ein
  Freitextfeld (**Pflicht**, **max. 35 Zeichen**). Der Inhalt wird
  pro Behandlung gespeichert und ersetzt in der Rechnungszeile
  (§3.2 / AC-RECH-10) den Text „Sonstiges" als Tätigkeit-Label.
  Bei jeder anderen Tätigkeit wird das Feld nicht angezeigt und
  bleibt leer.
- **Gruppentherapie** (Checkbox): wird pro Behandlung
  **gespeichert** und in der Eingabemaske aus dem entsprechenden
  Wert der Therapie (§2.3) **vorbelegt**; die Therapeutin kann den
  Wert pro Behandlung überschreiben.

### 2.5 Erziehungsberechtigte (Beziehung zu Kind, 0 – 2)

Eigene Datenbank-Entity. Pro Kind dürfen **null, ein oder zwei**
Erziehungsberechtigte hinterlegt sein. Felder:

- **Vorname**, **Nachname**
- Adresse — **vollständige eigene Adresse** (Straße, Hausnummer,
  PLZ, Stadt). **Falls die Adresse leer bleibt**, wird beim Lesen
  und beim Drucken die **Adresse des Kindes** als Fallback
  verwendet (kein automatisches Kopieren in die Felder; die
  Felder bleiben in der DB leer).
- **E-Mail 1**, **E-Mail 2** (beide optional)
- **Telefonnummer 1**, **Telefonnummer 2** (beide optional)

Die Reihenfolge der zwei Einträge am Kind ist stabil
(„Erziehungsberechtigte 1" / „Erziehungsberechtigte 2") — das
Kind-Formular zeigt zwei feste Slots (§3.5).

## 3. Kernabläufe

### 3.1 Behandlung erfassen (Handy-Schnellerfassung)

Im Hauptmenü heißt der Eintrag, der zu dieser Erfassungsmaske führt,
**„Behandlungen"** (nicht „Schnellerfassung").

In wenigen Taps: Kind auswählen → Therapie → BE (Stepper) → Datum
(Vorbelegung: heute) → **Tätigkeit** (vorbelegt aus der Therapie,
überschreibbar; bei „Sonstiges" Pflicht-Freitextfeld bis 35 Zeichen,
§2.4) → Speichern. Nach dem Speichern bleibt die Maske
bereit für die **schnelle Erfassung mehrerer Behandlungen in Folge**
(z. B. beim Nacherfassen eines Tages): Kind/Therapie-Auswahl bleiben
erhalten, Datum und BE werden für den nächsten Eintrag
zurückgesetzt.

**Behandlungsliste unterhalb der Erfassung:** Sobald Kind und
Therapie ausgewählt sind, zeigt die Maske unterhalb der
Erfassungsfelder eine Liste **aller bereits erfassten Behandlungen**
dieser Therapie, **sortiert nach Datum absteigend** (neueste zuerst).
Spalten der Liste:

| Datum | Tätigkeit | BE |

Rechts neben der Spalte **BE** wird zusätzlich der Hinweis
**„noch verfügbar: X BE"** angezeigt; `X` = Gesamtzahl bewilligter
BE der Therapie (§2.3) − Summe der BE aller bereits erfassten
Behandlungen dieser Therapie. Beim Speichern einer neuen Behandlung
wird der Wert **sofort aktualisiert**.

**Bearbeiten / Löschen:** Jede Listenzeile bietet Aktionen
**„Bearbeiten"** (öffnet die Behandlung erneut zur Korrektur) und
**„Löschen"** (mit Bestätigungsdialog „Behandlung wirklich
löschen?" — „Ja" / „Abbrechen"). Nach Speichern bzw. Löschen
aktualisieren sich Liste und „noch verfügbar"-Hinweis sofort.

### 3.2 Monatsrechnung erstellen

Therapeutin wählt Monat, Kind, Auftraggeber und **Rechnungsdatum**
(Vorbelegung: heute). Zusätzlich kann sie die **laufende Nummer
`NNNN` der Rechnungsnummer** prüfen und ggf. anpassen: das
Eingabefeld ist mit der **nächsten freien `NNNN`** des Jahres
gemäß §4 vorbelegt; der vorangestellte Teil `RE-YYYY-MM-` wird vom
System aus Rechnungsjahr und Abrechnungsmonat abgeleitet und ist
**nicht editierbar**. Das System

- sammelt alle Behandlungen dieses Kinds für diesen Auftraggeber im Monat,
- erzeugt **eine Rechnung** mit einer Zeile pro Behandlung. Die
  Rechnungszeile hat die folgenden **Spalten in dieser Reihenfolge**:

  | Pos | Anzahl | Einheit | Bezeichnung | Einzel € | Gesamt € |
  - **Pos** = laufende Positionsnummer innerhalb der Rechnung
  - **Anzahl** = Anzahl **BE** der Behandlung
  - **Einheit** = fest der Text „BE"
  - **Bezeichnung** = `<DD.MM.YYYY> · <Tätigkeit>` der Behandlung
    (Fallback auf die Therapieform, wenn die Tätigkeit fehlt, §2.4).
    Bei Tätigkeit „Sonstiges" wird stattdessen der pro Behandlung
    erfasste **Sonstiges-Freitext** (§2.4, max. 35 Zeichen) eingesetzt.
  - **Einzel €** = Stundensatz des Auftraggebers (§2.2)
  - **Gesamt €** = Anzahl × Einzel

- vergibt die Rechnungsnummer (Abschnitt 4),
- erzeugt die PDF (siehe Abschnitt 5) und legt sie als Datei im Ordner
  `~/.behandlungsverwaltung/bills/` unter dem Dateinamen
  `RE-YYYY-MM-NNNN-<Name Kind>.pdf` ab (Präfix `RE-` plus Jahr, Monat
  und laufende Nummer gemäß Abschnitt 4; Beispiel:
  `RE-2026-04-0001-Anna_Musterfrau.pdf`).

**Direktlink nach der Erzeugung:** Sobald die Rechnung erfolgreich
erstellt ist, zeigt die Erfolgsmeldung **zusätzlich einen Link auf
die soeben erzeugte Rechnungs-PDF** an („Rechnung öffnen"), so dass
die Therapeutin sie ohne Umweg über die Rechnungsübersicht direkt
ansehen oder herunterladen kann.

**Duplikat-Schutz:** Existiert für den gewählten Monat, das Kind und
den Auftraggeber bereits eine Rechnung, so erscheint beim Start der
Erzeugung ein Bestätigungsdialog („Für diesen Monat wurde bereits
eine Rechnung erzeugt — neu erzeugen?"). Die Therapeutin muss
**explizit mit „Ja" bestätigen** oder mit **„Abbrechen"** abbrechen.
Nur bei „Ja" wird die bestehende Rechnung überschrieben.

**Nachträgliche Korrektur:** Rechnungen können nachträglich
**korrigiert werden, indem sie einfach mit den korrigierten Daten
neu erstellt werden** (gleicher Ablauf wie oben, mit dem
Duplikat-Dialog als expliziter Zustimmung). Die Rechnungsnummer
bleibt dabei unverändert (§4).

### 3.3 Stundennachweis drucken

Therapeutin wählt Kind, Auftraggeber und Monat. Das System erzeugt ein
**Blanko-Formular** mit vorausgefülltem Kopf (Kind, Auftraggeber, Monat)
und einer Tabelle mit leeren Zeilen. Spalten der Tabelle:

| Datum | BE | Leistung | Unterschrift |

Die Zeilen werden **vor Ort handschriftlich** ausgefüllt.
Der Stundennachweis teilt sich die Rechnungsnummer mit der Rechnung
desselben Abrechnungsmonats. Die Datei wird unter
`~/.behandlungsverwaltung/timesheets/` als
`ST-YYYY-MM-NNNN-<Kindesname>.pdf` abgelegt
(Präfix `ST-` plus Jahr, Monat und laufende Nummer gemäß Abschnitt 4;
Beispiel: `ST-2026-04-0001-Anna_Musterfrau.pdf`).
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

**Erziehungsberechtigte im Kind-Formular:** Das Formular zeigt
**zwei feste Slots** „Erziehungsberechtigte 1" und
„Erziehungsberechtigte 2". Pro Slot wird **der Nachname** angezeigt
(oder der Slot bleibt **leer**, wenn nichts erfasst ist). Neben jedem
Slot steht ein **„Bearbeiten"-Button**: er öffnet das
Erziehungsberechtigten-Formular (Vorname, Nachname, vollständige
Adresse, E-Mail 1/2, Telefon 1/2 — alle optional bis auf den Namen).
Nach „Speichern" oder „Abbrechen" kehrt die UI zur Kind-Maske zurück
und zeigt im jeweiligen Slot den aktualisierten Nachnamen.

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
das Kommentarfeld Pflicht), erfasst das **Startdatum** und die
Gesamtzahl bewilligter Behandlungseinheiten. Nach dem Speichern
erscheint die Therapie sowohl unter der Detailansicht des Kindes als
auch unter der des Auftraggebers.

**Tabellenanzeige der Therapieliste** — die Liste der Therapien hat
folgende Spalten (in dieser Reihenfolge):

| Nachname | Vorname | Geleistete BE | Therapieform |

- **Nachname / Vorname** = des verknüpften Kindes
- **Geleistete BE** = Summe der BE aller bereits erfassten
  Behandlungen dieser Therapie (nicht: bewilligte Gesamtzahl)
- **Therapieform** = Wert aus §2.3 (Klartext-Bezeichnung)

### 3.8 Rechnungen pro Auftraggeber und Monat herunterladen

Therapeutin wählt **Auftraggeber** und **Monat** und stößt
„Rechnungen herunterladen" an. Das System stellt **alle für diesen
Auftraggeber in diesem Monat erzeugten Rechnungen** (über alle Kinder
hinweg) zum Download bereit — entweder als gebündeltes Archiv
(`RE-YYYY-MM-<Auftraggeber>.zip`) oder einzeln.

Für jede heruntergeladene Rechnung vermerkt das System in der
Rechnungstabelle, dass sie **zum Versand heruntergeladen** wurde
(Zeitstempel „heruntergeladen am …"). Der **tatsächliche Versand
erfolgt außerhalb der App** durch die Therapeutin; das System kann
den Versand nicht überwachen und behauptet ihn auch nicht — der
Vermerk markiert ausschließlich „zum Versand abgeholt".

## 4. Rechnungsnummer

Format: **`RE-YYYY-MM-NNNN`**

- Präfix **`RE-`** — fester Bestandteil jeder Rechnungsnummer
- `YYYY` = vierstellige Jahreszahl der Rechnung
- `MM` = zweistelliger Abrechnungsmonat (`01`–`12`) — **immer Teil der
  Rechnungsnummer**
- `NNNN` = vierstellige laufende Nummer **innerhalb des Jahres**
  (über alle Monate, Kinder und Auftraggeber hinweg). Der Zähler
  startet am Jahresanfang bei `0001` und wird ausschließlich **jährlich**
  zurückgesetzt — nicht pro Monat.

Beispiele (Jahr 2026):

- Erste Rechnung im April 2026 → `RE-2026-04-0001`
- Zweite Rechnung im April 2026 → `RE-2026-04-0002`
- Nächste Rechnung (erste im Mai 2026) → `RE-2026-05-0003`
- Nächste Rechnung (reset bei neuem Jahr) → `RE-2027-01-0001`

Beim Erzeugen schlägt das System die **nächste freie Nummer** vor.
Die Therapeutin kann im Erzeugen-Dialog **ausschließlich die
fortlaufende Nummer `NNNN`** überschreiben (z. B. um eine Lücke
aufzufüllen). Die übrigen Bestandteile **Präfix `RE-`**, **Jahr
`YYYY`** und **Abrechnungsmonat `MM`** sind im Dialog fest und
nicht editierbar — sie ergeben sich aus Rechnungsdatum bzw.
gewähltem Abrechnungsmonat und werden vom System gesetzt. Eine
manuell vergebene `NNNN` muss vierstellig (mit führenden Nullen)
und im Jahr **eindeutig** sein. Sobald die Rechnung erzeugt ist,
ist die Nummer **fest** und bleibt unverändert — auch bei einer
nachträglichen Korrektur (§3.2) bleibt die Rechnungsnummer gleich,
die PDF-Datei wird neu erzeugt.

Der zugehörige Stundennachweis übernimmt dieselbe Rechnungsnummer
(Jahr/Monat/laufende Nummer), ersetzt im Dateinamen aber das Präfix
`RE-` durch `ST-` und ergänzt den Kindesnamen (siehe 3.3).

## 5. PDF-Vorlagen

Die Therapeutin hinterlegt eigene PDF-Vorlagen mit ihrem Briefkopf.

- **Eine Vorlage pro Auftraggeber** (optional, falls gewünscht)
- **Eine globale Fallback-Vorlage**, wenn ein Auftraggeber keine eigene hat
- Je **Vorlagen-Typ** getrennt: eine für **Rechnung**, eine für
  **Stundennachweis**

### Technologie — Rechnungsvorlage

Die Rechnungsvorlage ist ein **PDF mit AcroForm-Feldern**
(pdftemplateconcept.md / pdftemplateimplementation.md). Die
Therapeutin pflegt die Vorlage in **PDF-XChange Editor** und
platziert die benannten Textfelder dort, wo sie gerendert werden
sollen. Die App füllt sie mit `pdf-lib` und ruft `form.flatten()`
auf, sodass das erzeugte PDF in jedem Viewer gleich aussieht.

**Feld-Inventar** (Groß-/Kleinschreibung exakt):

| Feldname            | Typ              | Zweck                                                                                                                                |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `empfaengerAdresse` | Text (multiline) | Anschriftsblock; bei Firma mit hinterlegter **Abteilung** (§2.2) wird diese als zweite Zeile direkt unter dem Firmennamen ausgegeben |
| `rechnungsnummer`   | Text             | `RE-YYYY-MM-NNNN`; klein gesetztes Feld neben „Rechnungsnummer:" in der Vorlage                                                      |
| `rechnungsnummer2`  | Text (optional)  | `RE-YYYY-MM-NNNN`; großes „Rechnung Nr."-Feld in der Vorlage. Fehlt es, wird es still ignoriert (kompatibel zu älteren Vorlagen)     |
| `rechnungsdatum`    | Text             | Ausstellungsdatum `DD.MM.YYYY`                                                                                                       |
| `leistungszeitraum` | Text             | z. B. `01.04.2026 – 30.04.2026`                                                                                                      |
| `einleitungstext`   | Text (multiline) | **Rechnungskopf-Text** aus dem Auftraggeber-Stammdatensatz (§2.2), unverändert übernommen                                            |
| `kindTitel`         | Text             | `Vorname Nachname · geb. <DD.MM.YYYY> · Aktenzeichen · im <Monat> <Jahr>`                                                            |
| `gesamtsumme`       | Text             | formatierter Gesamtbetrag, z. B. `189,78 €`                                                                                          |
| `unterschriftName`  | Text (optional)  | Kindesname im Unterschriftsblock                                                                                                     |

Fehlende optionale Felder werden still ignoriert, sodass die
Therapeutin die Vorlage iterativ erweitern kann.

**Tabellenbereich**: die App zeichnet pro Behandlung eine Zeile
(Pos · Anzahl BE · Einheit · Datum + Taetigkeit-Label · Einzel €
· Gesamt €) in die Tabellenzone der Vorlage. Koordinaten sind in
`apps/server/src/pdf/layout.ts#LAYOUT.rechnung` hinterlegt — die
Vorlage muss einen dazu passenden Tabellenrahmen gedruckt
enthalten. Leere Zeilen bleiben leer. Phase 1 unterstützt so
viele Behandlungen, wie in die Zone passen; darüber hinaus wird
`TooManyBehandlungenError` ausgelöst (Paginierung in Phase 2).

**Optimierte Vorlage:** Die produktive Rechnungsvorlage liegt als
`rechnungsvorlage.pdf` im Repo-Root und ist die Referenz für die
Tabellen- und Spaltenkoordinaten in
`apps/server/src/pdf/layout.ts#LAYOUT.rechnung`. Eckdaten der
Vorlage (DIN A4, Ursprung unten-links): Tabellenrahmen `x ∈
[50, 545]`, `y ∈ [183.5, 513.3]`; Header-Höhe 22 pt mit Unterkante
bei `y = 491.3`; Spaltentrenner bei `x = 50, 96, 136, 176, 415,
480, 545`. Die Spaltenüberschrift für den Stundensatz lautet in
der Vorlage **„BE €"** (gleichbedeutend mit „Einzel €" im PRD-
Wording — der pro Behandlungseinheit abgerechnete Betrag).

USt-Hinweis, Zahlungsziel, Dankestext und Unterschriftsbereich
sind **statischer Bestandteil der Vorlage** — sie werden nicht
vom Code gezeichnet.

**Speicherort der Vorlagen:** Die PDF-Vorlagen werden **als Dateien** in
einem Verzeichnis `templates/` **neben der Datenbankdatei** abgelegt
(nicht in der Datenbank). Die Therapeutin kann die Vorlagen dort
notfalls auch direkt austauschen.

### Vorlagen-Verwaltung (UI)

Die Vorlagen werden in der UI **analog zu den anderen Stammdaten**
(Kind, Auftraggeber, Therapie) verwaltet — als eigene Liste mit
**„Neu"-Button** und einer Tabelle der bereits hinterlegten Vorlagen.

**Listenspalten:**

| Geltungsbereich | Typ | Datei |

- **Geltungsbereich** = entweder **„Global"** (Fallback-Vorlage) oder
  der **Auftraggebername**, dem die Vorlage zugeordnet ist
- **Typ** = **Rechnung** oder **Stundennachweis**
- **Datei** = **PDF-Link** auf die hochgeladene Vorlage (Klick öffnet
  oder lädt die Vorlage herunter)

**Hochladen einer Vorlage:** Statt der bisherigen zwei Schritte
(„Datei auswählen" + getrennter „Hochladen"-Button) gibt es einen
**einzigen kombinierten Button** „**PDF-Datei hochladen**". Ein Klick
öffnet den Dateidialog; sobald die Therapeutin eine Datei wählt und
den Dateidialog bestätigt, **startet der Upload automatisch**. Nach
erfolgreichem Upload erscheint eine **deutliche Bestätigungsmeldung**
(„Vorlage hochgeladen") und die neue Vorlage erscheint sofort in der
Liste. Während des Uploads zeigt der Button einen Lade-Indikator.

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
- **AC-KIND-04** `[unit][e2e]` Given das Kind-Formular, Then sind
  zwei feste Slots **„Erziehungsberechtigte 1"** und
  **„Erziehungsberechtigte 2"** sichtbar; jeder Slot zeigt den
  hinterlegten **Nachnamen** an oder bleibt **leer**, wenn keine
  Erziehungsberechtigte erfasst ist. Neben jedem Slot steht ein
  **„Bearbeiten"-Button**, der das Erziehungsberechtigten-Formular
  öffnet und nach „Speichern" / „Abbrechen" zur Kind-Maske
  zurückkehrt.
- **AC-KIND-05** `[unit]` Given ein Kind hat eine
  Erziehungsberechtigte ohne eigene Adresse, Then wird beim Lesen
  und Drucken die Adresse des Kindes als **Fallback** verwendet;
  die Adressfelder am Erziehungsberechtigten bleiben in der DB
  leer.

### Erziehungsberechtigte

- **AC-EZB-01** `[unit]` Given das Erziehungsberechtigten-Formular,
  Then sind **Vorname** und **Nachname** Pflicht; Adresse, E-Mail 1,
  E-Mail 2, Telefon 1 und Telefon 2 sind **optional**.
- **AC-EZB-02** `[unit]` Given ein Kind, Then können **0, 1 oder 2**
  Erziehungsberechtigte hinterlegt sein; ein dritter Eintrag wird
  durch das UI-Modell (zwei feste Slots) ausgeschlossen.

### Auftraggeber

- **AC-AG-01** `[e2e]` Given leere Auftraggeberliste, When ein neuer
  Auftraggeber vom Typ Firma angelegt wird, Then wird Firmenname
  angezeigt, Vorname/Nachname sind leer.
- **AC-AG-02** `[unit]` Given Typ = Person, When ohne Vor- oder
  Nachname gespeichert, Then Validierungsfehler.
- **AC-AG-03** `[unit]` Given ein Auftraggeber ohne PLZ, Then
  Validierungsfehler „PLZ ist Pflicht".
- **AC-AG-04** `[unit]` Given Typ = Firma, Then ist das Feld
  **Abteilung** verfügbar und **optional**; bei Typ = Person ist
  das Feld nicht verfügbar.
- **AC-AG-05** `[unit]` Given das „Neu"-Formular für einen
  Auftraggeber, Then ist der **Rechnungskopf-Text** (mehrzeilig,
  §2.2) ein Pflichtfeld; ohne Wert kommt der Validierungsfehler
  „Rechnungskopf-Text ist Pflicht".
- **AC-AG-06** `[unit]` Given das Auftraggeber-Formular, Then
  enthält es für Gruppentherapien **acht optionale Felder**
  (`gruppe1Prozent`, `gruppe1Stundensatz`, `gruppe2Prozent`,
  `gruppe2Stundensatz`, `gruppe3Prozent`, `gruppe3Stundensatz`,
  `gruppe4Prozent`, `gruppe4Stundensatz`) für Gruppen mit 1 – 4
  Kindern; alle dürfen leer bleiben und werden in der Datenbank
  **denormalisiert direkt am Auftraggeber** gespeichert (keine
  separate Tabelle).

### Therapie

- **AC-TH-01** `[unit]` Given Therapieform = Sonstiges, When ohne
  Kommentar gespeichert, Then Fehler „Kommentar ist Pflicht bei
  Sonstiges".
- **AC-TH-02** `[e2e]` Given Kind und Auftraggeber existieren, When
  Therapeutin eine Therapie anlegt, Then erscheint sie unter beiden
  referenzierten Datensätzen.
- **AC-TH-03** `[unit]` Given die Therapieform-Auswahl, Then enthält
  sie genau: Dyskalkulie-Therapie, Lern-Therapie, **Legasthenie-Therapie**,
  **Resilienztraining**, Heilpädagogik, Elternberatung, Sonstiges.
- **AC-TH-04** `[unit][e2e]` Given das Therapie-Formular, Then ist die
  Checkbox **Gruppentherapie** standardmäßig **nicht angehakt**; When
  die Therapeutin sie anhakt und speichert, Then wird der Wert
  persistiert, in der Detailansicht als „Gruppentherapie: Ja"
  (sonst „Gruppentherapie: Nein") angezeigt und steht den abhängigen
  Behandlungen als Vorbelegung zur Verfügung (§2.4).
- **AC-TH-05** `[unit]` Given das Therapie-Formular, Then ist
  **Startdatum** ein Pflichtfeld; ohne Wert wird mit
  Validierungsfehler abgelehnt.
- **AC-TH-06** `[unit][e2e]` Given die Therapieliste, Then hat die
  Tabelle die Spalten **Nachname · Vorname · Geleistete BE ·
  Therapieform** in dieser Reihenfolge; **Geleistete BE** zeigt die
  Summe der bereits erfassten Behandlungs-BE dieser Therapie
  (nicht: bewilligte Gesamtzahl).

### Behandlung

- **AC-BEH-01** `[e2e]` Given eine Therapie existiert, When
  Therapeutin auf dem Handy eine Behandlung mit 2 BE für heute
  einträgt, Then erscheint sie in der Liste der Behandlungen dieser
  Therapie.
- **AC-BEH-02** `[unit]` Given BE = 0, Then Validierungsfehler
  („BE muss ≥ 1 sein").
- **AC-BEH-03** `[unit]` Given eine Therapie hat eine Tätigkeit
  hinterlegt, When eine neue Behandlung für diese Therapie erfasst
  wird, Then ist das Feld „Tätigkeit" im Erfassungsformular mit
  der Therapie-Tätigkeit **vorbelegt** und kann von der
  Therapeutin pro Behandlung überschrieben werden.
- **AC-BEH-04** `[unit]` Given die Tätigkeit-Auswahl für eine
  Behandlung, Then besteht die Werteliste aus **allen
  Therapieformen** (Dyskalkulie-Therapie, Lern-Therapie,
  Legasthenie-Therapie, Resilienztraining, Heilpädagogik, Elternberatung,
  Sonstiges) **plus** Elterngespräch, Lehrergespräch, Bericht,
  Förderplan, Teamberatung.
- **AC-BEH-05** `[e2e]` Given die Schnellerfassung ist geöffnet,
  When die Therapeutin eine Behandlung speichert, Then ist die
  Maske anschließend **sofort für die nächste Behandlung desselben
  Kinds/derselben Therapie bereit** (Kind/Therapie bleiben
  vorausgewählt, Datum/BE werden zurückgesetzt).
- **AC-BEH-06** `[unit]` Given eine Therapie hat
  `gruppentherapie = true` (bzw. `false`), When eine neue
  Behandlung für diese Therapie erfasst wird, Then ist die
  Checkbox **Gruppentherapie** im Erfassungsformular mit dem Wert
  der Therapie **vorbelegt** und kann von der Therapeutin pro
  Behandlung überschrieben werden; der Wert wird pro Behandlung
  persistiert.
- **AC-BEH-07** `[unit]` Given eine Therapie mit Startdatum
  `2026-04-01`, When eine Behandlung mit Datum `2026-03-31` erfasst
  wird, Then erscheint der Validierungsfehler „Datum liegt vor dem
  Startdatum der Therapie" und die Behandlung wird nicht gespeichert.
- **AC-BEH-08** `[unit][e2e]` Given die Tätigkeit ist auf
  **„Sonstiges"** gesetzt, Then erscheint zusätzlich ein
  **Pflicht-Freitextfeld** (max. 35 Zeichen). Ohne Wert kommt der
  Fehler „Beschreibung Pflicht bei Sonstiges". Bei jeder anderen
  Tätigkeit wird das Feld nicht angezeigt und nicht gespeichert.
- **AC-BEH-09** `[unit]` Given eine Behandlung mit Tätigkeit
  „Sonstiges" und Freitext „Hospitation Schule", Then enthält die
  Rechnungszeile (§3.2 / AC-RECH-10) im Bezeichnungs-Label genau
  diesen Freitext **anstelle** des Wortes „Sonstiges"
  (z. B. `15.04.2026 · Hospitation Schule`).
- **AC-BEH-10** `[e2e]` Given Kind und Therapie sind in der
  Behandlungserfassung ausgewählt, Then zeigt die Maske unterhalb
  der Erfassung eine Liste aller bereits erfassten Behandlungen
  dieser Therapie, **sortiert nach Datum absteigend**, mit Spalten
  **Datum · Tätigkeit · BE** und einem Hinweis **„noch verfügbar:
  X BE"** (X = bewilligte Gesamtzahl − Summe erfasste BE). Beim
  Speichern einer neuen Behandlung aktualisiert sich `X` sofort.
- **AC-BEH-11** `[e2e]` Given eine Listenzeile in der
  Behandlungsliste, Then bietet sie Aktionen **„Bearbeiten"** und
  **„Löschen"**; „Löschen" zeigt einen Bestätigungsdialog
  („Behandlung wirklich löschen?") und entfernt die Behandlung
  erst nach „Ja". Nach beiden Aktionen aktualisiert sich der
  „noch verfügbar"-Hinweis sofort.

### Rechnung

- **AC-RECH-01** `[e2e]` Given Behandlungen im April 2026 für Kind K
  und Auftraggeber A, When „Rechnung April 2026" erstellt wird, Then
  wird ein PDF erzeugt mit je einer Zeile pro Behandlung und
  korrekter Gesamtsumme.
- **AC-RECH-02** `[unit]` Given Stundensatz 45,00 € und Behandlung mit
  3 BE, Then Zeilenbetrag = 135,00 €.
- **AC-RECH-03** `[unit]` Given es existiert noch keine Rechnung im
  Jahr 2026 und die erste Rechnung des Jahres wird im April 2026
  erzeugt, Then erhält sie die Nummer `RE-2026-04-0001`.
- **AC-RECH-04** `[unit]` Given im Jahr 2026 existieren bereits
  `RE-2026-04-0001` und `RE-2026-04-0002`, When die nächste Rechnung
  im Mai 2026 erzeugt wird, Then erhält sie die Nummer
  `RE-2026-05-0003` (Zähler läuft jahresweise, nicht monatsweise).
- **AC-RECH-05** `[e2e]` Given eine Rechnung wurde erzeugt, When die
  Therapeutin sie erneut für denselben Monat, dasselbe Kind und
  denselben Auftraggeber anstoßen möchte, Then erscheint ein
  **Bestätigungsdialog** („Für diesen Monat wurde bereits eine
  Rechnung erzeugt — neu erzeugen?") mit den Optionen **„Ja"** und
  **„Abbrechen"**; nur nach „Ja" wird die Rechnung neu erzeugt.
- **AC-RECH-06** `[unit]` Given Auftraggeber A hat eine eigene
  Rechnungsvorlage hinterlegt, Then wird diese verwendet.
- **AC-RECH-07** `[unit]` Given Auftraggeber A hat keine eigene
  Vorlage, aber eine globale Rechnungs-Fallback-Vorlage existiert,
  Then wird die globale Vorlage verwendet.
- **AC-RECH-08** `[unit]` Given gültige Rechnungsdaten, Then enthält
  das PDF den USt-Befreiungshinweis (aus der Vorlage, §5) und
  **keinen** USt-Ausweis.
- **AC-RECH-09** `[e2e]` Given eine Rechnung wird für Kind „Anna
  Musterfrau" erzeugt, Then liegt die Datei unter
  `~/.behandlungsverwaltung/bills/` mit Dateinamen im Format
  `RE-YYYY-MM-NNNN-<Vorname_Nachname>.pdf`
  (z. B. `RE-2026-04-0001-Anna_Musterfrau.pdf`).
- **AC-RECH-10** `[unit]` Given eine Rechnungszeile, Then hat die
  Zeile genau die Spalten **Pos · Anzahl · Einheit · Bezeichnung ·
  Einzel € · Gesamt €** in dieser Reihenfolge; **Bezeichnung**
  enthält `<DD.MM.YYYY> · <Tätigkeit>` (mit Fallback auf die
  Therapieform, wenn die Tätigkeit fehlt, §2.4; bei Tätigkeit
  „Sonstiges" steht stattdessen der pro Behandlung erfasste
  **Sonstiges-Freitext**, AC-BEH-09); **Einheit** ist fest „BE".
- **AC-RECH-11** `[e2e]` Given eine Rechnung `RE-2026-04-0001`
  existiert, When die Therapeutin sie mit korrigierten Daten **neu
  erstellt** (Dialog „Ja"), Then wird die PDF mit den neuen Daten
  überschrieben und die Rechnungsnummer bleibt `RE-2026-04-0001`.
- **AC-RECH-12** `[e2e]` Given mehrere Rechnungen für Auftraggeber A
  im April 2026, When die Therapeutin in UC-3.8 „Rechnungen
  herunterladen" auslöst, Then werden alle Rechnungen für A/April
  2026 zum Download bereitgestellt und in der Rechnungstabelle als
  „heruntergeladen am …" markiert.
- **AC-RECH-13** `[unit]` Given die Therapeutin gibt beim Erzeugen
  `rechnungsdatum=2026-04-15` ein, Then steht `15.04.2026` im
  AcroForm-Feld `rechnungsdatum` der erzeugten PDF und in der
  Spalte `rechnungsdatum` der Rechnungszeile.
- **AC-RECH-14** `[unit]` Given eine Rechnung mit N Behandlungen im
  Monat, Then enthält das PDF genau N Tabellenzeilen (eine pro
  Behandlung), leere Pflichtzeilen werden **nicht** erzeugt.
- **AC-RECH-15** `[e2e]` Given die Therapeutin öffnet den Dialog
  „Rechnung erzeugen", Then ist das Feld **Rechnungsnummer**
  zerlegt in einen **fixen Teil `RE-YYYY-MM-`** (read-only,
  abgeleitet aus Rechnungsjahr und Abrechnungsmonat) und ein
  **editierbares Eingabefeld für `NNNN`**, das mit der **nächsten
  freien laufenden Nummer** des Jahres gemäß §4 vorbelegt ist; die
  Therapeutin kann ausschließlich diese vierstellige Nummer ändern,
  und nach dem Erzeugen wird die Rechnung mit `RE-YYYY-MM-NNNN`
  unter Verwendung der bestätigten `NNNN` gespeichert. Eine bereits
  im selben Jahr vergebene `NNNN` wird mit Fehler abgewiesen.
- **AC-RECH-16** `[unit]` Given eine erzeugte Rechnung, Then enthält
  das AcroForm-Feld `kindTitel` Vorname, Nachname, **Geburtsdatum
  (`geb. DD.MM.YYYY`)**, Aktenzeichen und den Abrechnungsmonat in
  dieser Reihenfolge.
- **AC-RECH-17** `[unit]` Given Auftraggeber A hat den
  Rechnungskopf-Text „Mein Honorar für die Lern-Therapie von …"
  hinterlegt, When eine Rechnung für A erzeugt wird, Then steht
  dieser Text **wortgetreu** im AcroForm-Feld `einleitungstext` der
  PDF (kein code-generierter Satz aus der Therapieform).
- **AC-RECH-18** `[unit]` Given Auftraggeber A vom Typ Firma hat
  die Abteilung „Wirtschaftliche Jugendhilfe" hinterlegt, When eine
  Rechnung für A erzeugt wird, Then enthält das AcroForm-Feld
  `empfaengerAdresse` direkt unter dem Firmennamen die Zeile
  „Wirtschaftliche Jugendhilfe"; ohne hinterlegte Abteilung
  entfällt diese Zeile ersatzlos.
- **AC-RECH-19** `[e2e]` Given die Therapeutin hat eine Rechnung
  erfolgreich erzeugt, Then zeigt die Erfolgsmeldung **zusätzlich
  einen Link „Rechnung öffnen"** auf die soeben erzeugte PDF;
  ein Klick öffnet bzw. lädt die Rechnungs-PDF, ohne dass die
  Therapeutin in die Rechnungsübersicht wechseln muss.

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
- **AC-STD-04** `[unit]` Given die Rechnungsnummer `RE-2026-04-0001`
  und das Kind „Anna Musterfrau", Then hat die
  Stundennachweis-Datei den Namen `ST-2026-04-0001-Anna_Musterfrau.pdf`
  (Präfix `ST-` statt `RE-`).

### PDF-Vorlagen-Verwaltung

- **AC-TPL-01** `[e2e]` Given ein PDF wird als Vorlage für einen
  Auftraggeber hochgeladen, Then liegt die Datei im Ordner
  `~/.behandlungsverwaltung/templates/` und wird künftig für dessen
  Rechnungen verwendet.
- **AC-TPL-02** `[unit]` Given ein Vorlagendatei wird manuell im
  `templates/`-Ordner ersetzt, Then verwendet die nächste
  Rechnungserzeugung die neue Datei (keine DB-Kopie).
- **AC-TPL-03** `[e2e]` Given die Vorlagen-Verwaltung, Then zeigt
  sie eine Liste mit Spalten **Geltungsbereich · Typ · Datei**;
  „Geltungsbereich" lautet **„Global"** für die Fallback-Vorlage
  oder enthält den **Auftraggebernamen**, „Typ" ist **Rechnung**
  oder **Stundennachweis**, und „Datei" ist ein **PDF-Link**, der
  beim Klick die hinterlegte Vorlage öffnet bzw. herunterlädt.
  Über einen **„Neu"-Button** lassen sich neue Vorlagen anlegen
  (analog zu Kind / Auftraggeber / Therapie).
- **AC-TPL-04** `[e2e]` Given die „Neu"-Maske der
  Vorlagen-Verwaltung, Then existiert ein **kombinierter Button**
  „**PDF-Datei hochladen**". Ein Klick öffnet den Dateidialog;
  sobald die Therapeutin eine Datei wählt und den Dialog
  bestätigt, **startet der Upload automatisch** ohne weiteren
  Klick. Nach erfolgreichem Upload erscheint eine deutliche
  Bestätigungsmeldung „Vorlage hochgeladen" und die Vorlage
  erscheint sofort in der Liste.

### Speicherung

- **AC-SYS-01** `[e2e]` Given frischer Start der App, Then entstehen
  `~/.behandlungsverwaltung/app.db`,
  `~/.behandlungsverwaltung/templates/` und
  `~/.behandlungsverwaltung/bills/`, falls nicht vorhanden.

## 10. End-to-End Use-Case-Szenarien (Gherkin)

Die folgenden zehn Gherkin-Features spezifizieren die vollständigen
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
    And eine Therapie „Lern-Therapie" verknüpft „Anna Musterfrau" und „Jugendamt Köln"

  Scenario: 2 BE für heute mit der Schnellerfassung speichern
    Given ich öffne die Schnellerfassung auf einem 390×844-Viewport
    When ich „Anna Musterfrau" als Kind auswähle
    And ich die Therapie „Lern-Therapie" auswähle
    And ich BE auf 2 setze
    And ich das vorbelegte Datum (heute) unverändert lasse
    And ich die aus der Therapie vorbelegte Tätigkeit unverändert lasse
    And die Checkbox „Gruppentherapie" ist mit dem Wert der Therapie vorbelegt
    And ich „Speichern" antippe
    Then sehe ich die Bestätigung „Behandlung gespeichert"
    And die Behandlungsliste der Therapie „Lern-Therapie" enthält einen Eintrag mit heutigem Datum, „2 BE" und der Tätigkeit „Lern-Therapie"

  Scenario: Mehrere Behandlungen in Folge schnell erfassen
    Given ich öffne die Schnellerfassung auf einem 390×844-Viewport
    And Kind „Anna Musterfrau" und Therapie „Lern-Therapie" sind ausgewählt
    When ich eine Behandlung für „2026-04-20" mit 2 BE speichere
    Then sehe ich die Bestätigung „Behandlung gespeichert"
    And Kind und Therapie sind weiterhin ausgewählt
    And Datum und BE sind für den nächsten Eintrag zurückgesetzt
    When ich eine Behandlung für „2026-04-21" mit 1 BE speichere
    Then enthält die Behandlungsliste der Therapie „Lern-Therapie" beide Einträge

  Scenario: Behandlungsliste mit „noch verfügbar"-Hinweis
    Given die Therapie „Lern-Therapie" hat 60 bewilligte BE
    And für diese Therapie wurden bereits 8 BE erfasst
    When ich Kind „Anna Musterfrau" und Therapie „Lern-Therapie" auswähle
    Then sehe ich unterhalb der Erfassung eine Liste mit Spalten „Datum · Tätigkeit · BE", sortiert nach Datum absteigend
    And rechts neben der Spalte „BE" steht „noch verfügbar: 52 BE"
    When ich eine neue Behandlung mit 2 BE speichere
    Then aktualisiert sich der Hinweis auf „noch verfügbar: 50 BE"
    And die neue Behandlung erscheint als oberste Zeile der Liste

  Scenario: Tätigkeit „Sonstiges" erfordert einen Pflicht-Freitext (max. 35 Zeichen)
    Given ich öffne die Schnellerfassung auf einem 390×844-Viewport
    And Kind „Anna Musterfrau" und Therapie „Lern-Therapie" sind ausgewählt
    When ich die Tätigkeit auf „Sonstiges" setze
    Then erscheint zusätzlich ein Pflicht-Freitextfeld mit max. 35 Zeichen
    When ich das Freitextfeld leer lasse
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Beschreibung Pflicht bei Sonstiges"
    When ich „Hospitation Schule" eingebe und auf „Speichern" tippe
    Then sehe ich die Bestätigung „Behandlung gespeichert"
    And eine spätere Rechnungszeile dieser Behandlung enthält im Bezeichnungs-Label „Hospitation Schule" statt „Sonstiges"
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
    And eine Therapie „Lern-Therapie" verknüpft die beiden
    And im April 2026 wurden drei Behandlungen mit je 2 BE erfasst
    And eine globale Rechnungsvorlage ist hochgeladen

  Scenario: Rechnung für April 2026 erzeugen
    Given ich öffne die Seite „Rechnung erstellen"
    When ich Monat „April 2026" wähle
    And ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    Then ist das Feld „Rechnungsnummer" mit „RE-2026-04-0001" vorbelegt
    When ich die vorbelegte Rechnungsnummer unverändert lasse
    And ich „Rechnung erzeugen" antippe
    Then sehe ich die Bestätigung „Rechnung erstellt: RE-2026-04-0001"
    And die Bestätigungsmeldung enthält einen Link „Rechnung öffnen", der die soeben erzeugte PDF öffnet
    And die Datei „RE-2026-04-0001-Anna_Musterfrau.pdf" liegt im Ordner „bills/"
    And die Rechnungsübersicht zeigt eine Zeile mit Nummer „RE-2026-04-0001" und Gesamtsumme „270,00 €"
    And die Rechnungszeilen haben die Spalten „Bezeichnung · Menge · Einheit · Einzel € · Gesamt €" in dieser Reihenfolge
    And die Spalte „Einheit" enthält in jeder Zeile den Text „BE"

  Scenario: Nur die laufende Nummer NNNN ist editierbar
    Given ich öffne die Seite „Rechnung erstellen"
    When ich Monat „April 2026" wähle
    And ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    Then sehe ich vor dem Eingabefeld der laufenden Nummer den fixen Präfix „RE-2026-04-" als read-only
    And das Eingabefeld für „NNNN" ist mit „0001" vorbelegt
    When ich „NNNN" auf „0007" ändere
    And ich „Rechnung erzeugen" antippe
    Then sehe ich die Bestätigung „Rechnung erstellt: RE-2026-04-0007"
    And die Datei „RE-2026-04-0007-Anna_Musterfrau.pdf" liegt im Ordner „bills/"

  Scenario: Bestätigungsdialog bei bereits existierender Rechnung — Abbrechen
    Given für April 2026, Kind „Anna Musterfrau", Auftraggeber „Jugendamt Köln" existiert bereits die Rechnung „RE-2026-04-0001"
    When ich erneut „Rechnung erzeugen" für denselben Monat, dasselbe Kind und denselben Auftraggeber antippe
    Then erscheint der Bestätigungsdialog „Für diesen Monat wurde bereits eine Rechnung erzeugt — neu erzeugen?" mit den Optionen „Ja" und „Abbrechen"
    When ich „Abbrechen" antippe
    Then bleibt die bestehende Rechnung „RE-2026-04-0001" unverändert
    And es wird keine zweite Rechnung erzeugt

  Scenario: Nachträgliche Korrektur durch Neu-Erzeugung
    Given für April 2026, Kind „Anna Musterfrau", Auftraggeber „Jugendamt Köln" existiert bereits die Rechnung „RE-2026-04-0001"
    And eine Behandlung im April 2026 wurde korrigiert
    When ich „Rechnung erzeugen" für denselben Monat, dasselbe Kind und denselben Auftraggeber antippe
    And im Bestätigungsdialog „Ja" antippe
    Then wird die Datei „RE-2026-04-0001-Anna_Musterfrau.pdf" mit den korrigierten Daten neu erzeugt
    And die Rechnungsnummer bleibt „RE-2026-04-0001"
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
    And die Rechnung „RE-2026-04-0001" für April 2026 wurde bereits erzeugt
    And eine globale Stundennachweis-Vorlage ist hochgeladen

  Scenario: Stundennachweis für April 2026 erzeugen
    Given ich öffne die Seite „Stundennachweis"
    When ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    And ich Monat „April 2026" wähle
    And ich „Stundennachweis drucken" antippe
    Then sehe ich die Bestätigung „Stundennachweis erstellt"
    And die Datei „ST-2026-04-0001-Anna_Musterfrau.pdf" liegt im Ordner „timesheets/"
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
    Given die Rechnung „RE-2026-04-0001" für Kind „Anna Musterfrau" existiert
    And die Rechnung „RE-2026-04-0002" für Kind „Ben Beispiel" existiert
    And die Rechnung „RE-2026-05-0003" für Kind „Anna Musterfrau" existiert

  Scenario: Rechnungen eines Kindes anzeigen und PDF öffnen
    Given ich öffne die Rechnungsübersicht
    When ich den Filter „Kind" auf „Anna Musterfrau" setze
    Then sehe ich genau zwei Zeilen mit den Nummern „RE-2026-04-0001" und „RE-2026-05-0003"
    When ich bei „RE-2026-04-0001" auf „PDF" tippe
    Then wird die Datei „RE-2026-04-0001-Anna_Musterfrau.pdf" heruntergeladen
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

  Scenario: Kind löschen
    Given das Kind „Musterfrau, Anna" existiert in der Kinderliste
    And „Anna Musterfrau" ist keiner Therapie zugeordnet
    When ich die Kinderliste öffne
    And ich bei „Musterfrau, Anna" auf „Löschen" tippe
    And ich den Bestätigungsdialog „Kind wirklich löschen?" mit „Ja" bestätige
    Then verschwindet „Musterfrau, Anna" aus der Kinderliste

  Scenario: Kind mit verknüpfter Therapie kann nicht gelöscht werden
    Given das Kind „Musterfrau, Anna" existiert
    And eine Therapie verknüpft „Anna Musterfrau" mit einem Auftraggeber
    When ich bei „Musterfrau, Anna" auf „Löschen" tippe
    Then sehe ich die Fehlermeldung „Kind ist mit einer Therapie verknüpft und kann nicht gelöscht werden"
    And „Musterfrau, Anna" bleibt in der Kinderliste

  Scenario: Erziehungsberechtigte über Slot „Erziehungsberechtigte 1" erfassen
    Given das Kind „Musterfrau, Anna" existiert
    When ich „Musterfrau, Anna" öffne und auf „Bearbeiten" tippe
    Then sehe ich die Slots „Erziehungsberechtigte 1" und „Erziehungsberechtigte 2", beide leer
    When ich neben „Erziehungsberechtigte 1" auf „Bearbeiten" tippe
    And ich Vorname „Maria" und Nachname „Musterfrau" eingebe
    And ich E-Mail 1 „maria@example.org" und Telefon 1 „0221-123" eingebe
    And ich die Adressfelder leer lasse
    And ich auf „Speichern" tippe
    Then kehre ich zur Kind-Maske zurück
    And der Slot „Erziehungsberechtigte 1" zeigt den Nachnamen „Musterfrau"
    And der Slot „Erziehungsberechtigte 2" bleibt leer
    And in der Detailansicht der Erziehungsberechtigten wird die Adresse des Kindes als Fallback angezeigt
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
    And ich Abteilung „Wirtschaftliche Jugendhilfe" eingebe
    And ich Straße „Kalker Hauptstr." und Hausnummer „247-273" eingebe
    And ich PLZ „51103" und Stadt „Köln" eingebe
    And ich Stundensatz „45,00" eingebe
    And ich Rechnungskopf-Text „Mein Honorar für die Lern-Therapie von <Kind> berechne ich Ihnen wie folgt:" eingebe
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Auftraggeber gespeichert"
    And die Auftraggeberliste enthält eine Zeile mit Firmenname „Jugendamt Köln"
    And die Detailansicht zeigt Abteilung „Wirtschaftliche Jugendhilfe"
    And in der Detailansicht sind Vorname und Nachname nicht befüllt

  Scenario: Auftraggeber ohne Rechnungskopf-Text wird nicht gespeichert
    Given ich bin im „Neu"-Formular für einen Auftraggeber vom Typ Firma
    When ich Firmenname, Adresse und Stundensatz vollständig ausfülle
    And ich das Feld „Rechnungskopf-Text" leer lasse
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Rechnungskopf-Text ist Pflicht"
    And die Auftraggeberliste bleibt leer

  Scenario: Person ohne Namen wird nicht gespeichert
    Given ich bin im „Neu"-Formular für einen Auftraggeber
    When ich Typ „Person" wähle
    And ich PLZ „50667" und Stundensatz „45,00" eingebe
    And ich Vorname und Nachname leer lasse
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Vor- und Nachname Pflicht"
    And die Auftraggeberliste bleibt leer

  Scenario: Auftraggeber bearbeiten (Stundensatz anpassen)
    Given der Auftraggeber „Jugendamt Köln" mit Stundensatz 45,00 € existiert
    When ich die Auftraggeberliste öffne
    And ich „Jugendamt Köln" öffne und auf „Bearbeiten" tippe
    And ich den Stundensatz auf „47,50" ändere
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Auftraggeber gespeichert"
    And die Detailansicht von „Jugendamt Köln" zeigt Stundensatz „47,50 €"

  Scenario: Auftraggeber löschen
    Given der Auftraggeber „Jugendamt Köln" existiert
    And „Jugendamt Köln" ist keiner Therapie zugeordnet
    When ich bei „Jugendamt Köln" auf „Löschen" tippe
    And ich den Bestätigungsdialog „Auftraggeber wirklich löschen?" mit „Ja" bestätige
    Then verschwindet „Jugendamt Köln" aus der Auftraggeberliste

  Scenario: Auftraggeber mit verknüpfter Therapie kann nicht gelöscht werden
    Given der Auftraggeber „Jugendamt Köln" existiert
    And eine Therapie verknüpft ein Kind mit „Jugendamt Köln"
    When ich bei „Jugendamt Köln" auf „Löschen" tippe
    Then sehe ich die Fehlermeldung „Auftraggeber ist mit einer Therapie verknüpft und kann nicht gelöscht werden"
    And „Jugendamt Köln" bleibt in der Auftraggeberliste
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

  Scenario: Lern-Therapie mit 60 bewilligten BE anlegen
    Given ich öffne die Therapieliste
    When ich auf „Neu" tippe
    And die Checkbox „Gruppentherapie" ist standardmäßig nicht angehakt
    And ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    And ich Therapieform „Lern-Therapie" wähle
    And ich Startdatum „2026-04-01" eingebe
    And ich 60 als Gesamtzahl bewilligter Behandlungseinheiten eingebe
    And die Checkbox „Gruppentherapie" ist standardmäßig nicht angehakt
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Therapie gespeichert"
    And die Therapie erscheint in der Detailansicht von „Anna Musterfrau"
    And die Therapie erscheint in der Detailansicht von „Jugendamt Köln"
    And die Detailansicht der Therapie zeigt „Gruppentherapie: Nein"
    And die Therapieliste hat die Spalten „Nachname · Vorname · Geleistete BE · Therapieform"
    And die Zeile zeigt „Musterfrau · Anna · 0 · Lern-Therapie"

  Scenario: Therapie als Gruppentherapie anlegen
    Given ich öffne die Therapieliste
    When ich auf „Neu" tippe
    And ich Kind „Anna Musterfrau" wähle
    And ich Auftraggeber „Jugendamt Köln" wähle
    And ich Therapieform „Resilienztraining" wähle
    And ich 30 als Gesamtzahl bewilligter Behandlungseinheiten eingebe
    And ich die Checkbox „Gruppentherapie" anhake
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Therapie gespeichert"
    And die Detailansicht der Therapie zeigt „Gruppentherapie: Ja"

  Scenario: Therapieform „Sonstiges" ohne Kommentar wird abgelehnt
    Given ich bin im „Neu"-Formular für eine Therapie
    When ich Kind „Anna Musterfrau" und Auftraggeber „Jugendamt Köln" wähle
    And ich Therapieform „Sonstiges" wähle
    And ich das Kommentarfeld leer lasse
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Kommentar ist Pflicht bei Sonstiges"
    And die Therapieliste bleibt leer

  Scenario: Therapie bearbeiten (bewilligte BE erhöhen und Tätigkeit setzen)
    Given eine Therapie „Lern-Therapie" für „Anna Musterfrau" / „Jugendamt Köln" mit 60 bewilligten BE existiert
    When ich die Therapie öffne und auf „Bearbeiten" tippe
    And ich die Gesamtzahl bewilligter BE auf 80 ändere
    And ich die Tätigkeit auf „Elterngespräch" setze
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Therapie gespeichert"
    And die Detailansicht zeigt „80 BE" und Tätigkeit „Elterngespräch"

  Scenario: Therapie ohne erfasste Behandlungen löschen
    Given eine Therapie „Lern-Therapie" für „Anna Musterfrau" / „Jugendamt Köln" existiert
    And der Therapie sind keine Behandlungen zugeordnet
    When ich bei der Therapie auf „Löschen" tippe
    And ich den Bestätigungsdialog „Therapie wirklich löschen?" mit „Ja" bestätige
    Then verschwindet die Therapie aus der Therapieliste
    And sie erscheint nicht mehr in den Detailansichten von „Anna Musterfrau" und „Jugendamt Köln"

  Scenario: Therapie mit erfassten Behandlungen kann nicht gelöscht werden
    Given eine Therapie „Lern-Therapie" für „Anna Musterfrau" / „Jugendamt Köln" existiert
    And für diese Therapie wurde mindestens eine Behandlung erfasst
    When ich bei der Therapie auf „Löschen" tippe
    Then sehe ich die Fehlermeldung „Therapie hat erfasste Behandlungen und kann nicht gelöscht werden"
    And die Therapie bleibt in der Therapieliste

  Scenario: Behandlung mit Datum vor dem Startdatum wird abgelehnt
    Given eine Therapie „Lern-Therapie" mit Startdatum „2026-04-01" existiert
    When ich für diese Therapie eine Behandlung mit Datum „2026-03-31" erfassen möchte
    And ich auf „Speichern" tippe
    Then sehe ich die Fehlermeldung „Datum liegt vor dem Startdatum der Therapie"
    And die Behandlung wird nicht gespeichert
```

### UC-3.8 Rechnungen pro Auftraggeber und Monat herunterladen

```gherkin
Feature: Alle Rechnungen eines Auftraggebers für einen Monat herunterladen
  Als Therapeutin
  möchte ich alle Rechnungen eines Auftraggebers für einen bestimmten Monat in einem Schritt herunterladen
  damit ich sie gebündelt per E-Mail oder Post verschicken kann

  Background:
    Given ein Auftraggeber „Jugendamt Köln" existiert
    And die Rechnung „RE-2026-04-0001" für Kind „Anna Musterfrau" / Auftraggeber „Jugendamt Köln" / April 2026 existiert
    And die Rechnung „RE-2026-04-0002" für Kind „Ben Beispiel" / Auftraggeber „Jugendamt Köln" / April 2026 existiert
    And die Rechnung „RE-2026-05-0003" für Kind „Anna Musterfrau" / Auftraggeber „Jugendamt Köln" / Mai 2026 existiert
    And keine Rechnung ist bisher als „heruntergeladen" markiert

  Scenario: April-Rechnungen des Auftraggebers herunterladen und als versendet markieren
    Given ich öffne die Seite „Rechnungen pro Auftraggeber herunterladen"
    When ich Auftraggeber „Jugendamt Köln" wähle
    And ich Monat „April 2026" wähle
    And ich „Rechnungen herunterladen" antippe
    Then wird das Archiv „RE-2026-04-Jugendamt_Koeln.zip" heruntergeladen
    And es enthält genau die Dateien „RE-2026-04-0001-Anna_Musterfrau.pdf" und „RE-2026-04-0002-Ben_Beispiel.pdf"
    And die Rechnungsübersicht markiert „RE-2026-04-0001" und „RE-2026-04-0002" als „heruntergeladen am …"
    And die Rechnung „RE-2026-05-0003" bleibt unmarkiert
```

### UC-3.9 Behandlung bearbeiten und löschen

```gherkin
Feature: Eine erfasste Behandlung nachträglich korrigieren oder entfernen
  Als Therapeutin
  möchte ich eine bereits erfasste Behandlung bearbeiten oder löschen können
  damit ich Tippfehler oder falsch erfasste Einträge korrigieren kann, bevor eine Rechnung erzeugt oder neu erzeugt wird

  Background:
    Given eine Therapie „Lern-Therapie" für „Anna Musterfrau" / „Jugendamt Köln" existiert
    And für diese Therapie ist eine Behandlung vom „2026-04-15" mit 2 BE und Tätigkeit „Lern-Therapie" erfasst

  Scenario: Behandlung bearbeiten (Datum, BE und Tätigkeit ändern)
    Given ich öffne die Behandlungsliste der Therapie „Lern-Therapie"
    When ich die Behandlung vom „2026-04-15" öffne und auf „Bearbeiten" tippe
    And ich das Datum auf „2026-04-16" ändere
    And ich BE auf 3 setze
    And ich die Tätigkeit auf „Förderplan" ändere
    And ich auf „Speichern" tippe
    Then sehe ich die Bestätigung „Behandlung gespeichert"
    And die Behandlungsliste enthält einen Eintrag „2026-04-16 · 3 BE · Förderplan"
    And der ursprüngliche Eintrag „2026-04-15 · 2 BE · Lern-Therapie" ist nicht mehr vorhanden

  Scenario: Behandlung löschen
    Given ich öffne die Behandlungsliste der Therapie „Lern-Therapie"
    When ich bei der Behandlung vom „2026-04-15" auf „Löschen" tippe
    And ich den Bestätigungsdialog „Behandlung wirklich löschen?" mit „Ja" bestätige
    Then verschwindet die Behandlung aus der Behandlungsliste der Therapie

  Scenario: Abbrechen des Lösch-Dialogs lässt die Behandlung stehen
    Given ich öffne die Behandlungsliste der Therapie „Lern-Therapie"
    When ich bei der Behandlung vom „2026-04-15" auf „Löschen" tippe
    And ich den Bestätigungsdialog mit „Abbrechen" schließe
    Then bleibt die Behandlung „2026-04-15 · 2 BE · Lern-Therapie" in der Liste
```

### UC-3.10 PDF-Vorlage entfernen

```gherkin
Feature: Eine auftraggeber-spezifische PDF-Vorlage entfernen
  Als Therapeutin
  möchte ich eine nicht mehr benötigte Vorlage eines Auftraggebers entfernen können
  damit für diesen Auftraggeber wieder die globale Fallback-Vorlage verwendet wird

  Background:
    Given eine globale Rechnungs-Fallback-Vorlage ist hochgeladen
    And der Auftraggeber „Jugendamt Köln" hat eine eigene Rechnungsvorlage hinterlegt

  Scenario: Auftraggeber-Vorlage löschen — Fallback greift wieder
    Given ich öffne die Vorlagen-Verwaltung des Auftraggebers „Jugendamt Köln"
    When ich bei der Rechnungsvorlage auf „Entfernen" tippe
    And ich den Bestätigungsdialog „Vorlage wirklich entfernen?" mit „Ja" bestätige
    Then ist für „Jugendamt Köln" keine eigene Rechnungsvorlage mehr hinterlegt
    And die Datei liegt nicht mehr im Ordner „~/.behandlungsverwaltung/templates/"
    When anschließend eine Rechnung für „Jugendamt Köln" erzeugt wird
    Then wird die globale Fallback-Vorlage verwendet
```

### Zuordnung UC → Akzeptanzkriterien (Abschnitt 9)

| Use Case | deckt AC                                                                         | ergänzt (neu durch UC spezifiziert)                                                                                                  |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| UC-3.1   | AC-BEH-01, AC-BEH-03, AC-BEH-05, AC-BEH-08, AC-BEH-09, AC-BEH-10                 | Tätigkeit-Vorbelegung aus Therapie, Schnell-Nacherfassung, Behandlungsliste mit „noch verfügbar"-BE, Sonstiges-Freitext (§2.4, §3.1) |
| UC-3.2   | AC-RECH-01, AC-RECH-05, AC-RECH-09, AC-RECH-10, AC-RECH-11, AC-RECH-19           | Dateiname-Format `RE-…`, Dialog „Ja/Abbrechen", Korrektur-Flow, Direktlink „Rechnung öffnen" (§3.2, §4)                              |
| UC-3.3   | AC-STD-01, AC-STD-02, AC-STD-04                                                  | Ablage in `timesheets/` statt `bills/`, Dateiname-Format `ST-…` (§3.3)                                                               |
| UC-3.4   | —                                                                                | Filter- und Download-Flow aus §3.4                                                                                                   |
| UC-3.5   | AC-KIND-01, AC-KIND-02, AC-KIND-03, AC-KIND-04, AC-KIND-05, AC-EZB-01, AC-EZB-02 | Delete-Flow + Referenz-Schutz (Kind mit Therapie), Erziehungsberechtigte-Slots + Bearbeiten + Adress-Fallback                        |
| UC-3.6   | AC-AG-01, AC-AG-02, AC-AG-06                                                     | Update-Flow (Stundensatz), Delete-Flow + Referenz-Schutz, Gruppentherapie-Stundensätze                                               |
| UC-3.7   | AC-TH-01, AC-TH-02, AC-TH-04, AC-TH-05, AC-TH-06, AC-BEH-07                      | Update-Flow (BE, Tätigkeit), Delete-Flow + Referenz-Schutz, Startdatum + Validierung, Tabellenanzeige der Therapieliste              |
| UC-3.8   | AC-RECH-12                                                                       | Bündel-Download pro Auftraggeber/Monat, Versand-Vermerk (§3.8)                                                                       |
| UC-3.9   | AC-BEH-11                                                                        | Behandlung bearbeiten / löschen (Abbrechen-Pfad inkl.)                                                                               |
| UC-3.10  | AC-TPL-01 (Gegenstück), AC-TPL-03, AC-TPL-04                                     | Auftraggeber-Vorlage entfernen, Vorlagenliste mit Spalten + Direkt-Upload, Fallback greift wieder                                    |

### CRUD-Entity → E2E Mapping

Diese Tabelle dokumentiert die E2E-Abdeckung für
**Create · Read · Update · Delete** aller CRUD-Entitäten der App.
„n/a" = für diese Entität bewusst nicht vorgesehen (siehe Fußnote).

| Entität         | Create                                                | Read (Liste/Detail)                               | Update (Bearbeiten)                                                    | Delete (Löschen)                                                           |
| --------------- | ----------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Kind            | UC-3.5 (Szenario „Kind vollständig anlegen")          | UC-3.5 (Liste enthält Eintrag), UC-3.7 Background | UC-3.5 (`uc-3.5-kind.e2e.ts`, „Edit-Pfad AC-KIND-03")                  | UC-3.5 (Szenarien „Kind löschen" + Referenz-Schutz)                        |
| Auftraggeber    | UC-3.6 (Szenarien „Firma", „Person-Happy")            | UC-3.6 (Liste enthält Eintrag), UC-3.7 Background | UC-3.6 (Szenario „Auftraggeber bearbeiten — Stundensatz anpassen")     | UC-3.6 (Szenarien „Auftraggeber löschen" + Referenz-Schutz)                |
| Therapie        | UC-3.7 (Szenarien „Lern-Therapie", „Sonstiges-Happy") | UC-3.7 (Detailansicht beider Datensätze)          | UC-3.7 (Szenario „Therapie bearbeiten — BE erhöhen, Tätigkeit setzen") | UC-3.7 (Szenarien „Therapie löschen" + Referenz-Schutz bei Behandlungen)   |
| Behandlung      | UC-3.1 (Szenario „2 BE für heute")                    | UC-3.1 (Behandlungsliste der Therapie)            | UC-3.9 (Szenario „Behandlung bearbeiten — Datum/BE/Tätigkeit ändern")  | UC-3.9 (Szenarien „Behandlung löschen" + Abbrechen-Pfad)                   |
| Rechnung        | UC-3.2 (Szenario „Rechnung für April 2026")           | UC-3.4 (Rechnungsübersicht, Filter, PDF-Download) | UC-3.2 „Nachträgliche Korrektur" (Neu-Erzeugung, Nummer bleibt)        | n/a¹                                                                       |
| Stundennachweis | UC-3.3 (Szenario „Stundennachweis April 2026")        | — (kein separater Listen-UC)                      | n/a²                                                                   | n/a²                                                                       |
| PDF-Vorlage     | `templates.e2e.ts` (AC-TPL-01)                        | `templates.e2e.ts`                                | AC-TPL-02 (Dateisystem-Ersatz)                                         | UC-3.10 (Szenario „Auftraggeber-Vorlage löschen — Fallback greift wieder") |

**Fußnoten:**

- **¹ Rechnung · Delete — nicht vorgesehen:** Rechnungen werden nicht
  gelöscht. Nachträgliche Korrekturen erfolgen durch
  **Neu-Erzeugung** unter **Beibehaltung der Rechnungsnummer**
  (§3.2 „Nachträgliche Korrektur", §4).
- **² Stundennachweis · Update / Delete — nicht vorgesehen:**
  Stundennachweise werden bei Bedarf **neu gedruckt** (derselbe
  Flow wie UC-3.3); sie werden nicht separat bearbeitet oder
  gelöscht.
