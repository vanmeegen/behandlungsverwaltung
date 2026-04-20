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

5.  bitte gesondert behandeln, erst mit User diskutieren, welche Möglichkeiten es gibt, PDFs als Vorlagen zu nutzen die einfach bearbeitbar sind und trotzdem flexibel gefüllt werden können.
    Die Rechnung muss nur als PDF raus kommen, die Vorlage ist derzeit Word welches mit dem Ms PDF Drucker erzeugt wird;
    die Vorlage wird derzeit für jedes Kind manuell einmal angepasst und dann pro Rechnungsmonat kopiert.
    Alle PDF Vorlagen müssen Felder haben, und variable Bereiche mit Wiederholungen und Feldwiederholungen
    z.B. für eine Rechnungszeile. bitte analysiere ob das einfach geht mit einer passenden Library
