Änderungen PRD, bitte in prd.md einarbeiten als Präzisierungen
2.3
Therapieform: + LRS-Therapie, Resilienztraining
Arbeitsthema: umbenennen in Tätigkeit
alle Einträge von Therapieform,
zusätzlich Elterngespräch, Lehrergespräch, Bericht, Förderplan, Teamberatung

2.4
Tätigkeit wird erfasst, Vorbelegung von der Therapie in der Eingabemaske

3.1
Tätigkeit fehlt, muss erfasst werden aber vorbelegt mit Tätigkeit von Therapie
schnelle Erfassung von mehreren Behandlungen möglich

3.2
Rechnungszeile mit Spalten: Bezeichnung = Tätigkeit, Menge = Anzahl BE, Einheit fest BE, Einzel €, Gesamt €
pdf dateiname soll präfix RE- enthalten
Rechnungen können nachträglich korrigiert werden, dann werden sie einfach neu erstellt mit den korrigierten Daten
Wenn eine Rechnung schon existiert, soll beim Start der Erstellung eine Meldung kommen und der Nutzer muss mit Ja bestätigen oder Abbrechen.

3.3
am besten mit ST- Präfix

4.  Rechnungsnummer hat Präfix RE-

neuer Use Case 3.8: Rechnungen pro Auftraggeber pro Monat herunterladen --> lädt alle Rechnungen runter, vermerkt in der Rechnungstabelle
für die Heruntergeladenen Rechnungen dass sie verschickt wurden (muss Nutzer tun, kann System nicht überwachen)

Allgemein:
Bitte klären ob es E2E Szenarien für Bearbeiten und Löschen von allen CRUD Entities gibt und dokumentiere die mappings in Kapitel 10
als CRUD Entity E2E Mapping

5.  ✅ **erledigt (2026-04-21)** — Konzept in `pdftemplateconcept.md`,
    Plan in `pdftemplateimplementation.md`, PRD §5 überarbeitet.
    Ergebnis: AcroForm-basierte `briefvorlage.pdf` (PDF-XChange
    Editor) + code-gezeichnete Tabellenzeilen mit `pdf-lib`.
    Eine Vorlage-Technologie ohne zusätzliches Binary, pflegbar
    ohne Programmierkenntnisse.
