-- PRD §5 / pdftemplateconcept §3.1: Rechnungsdatum (Ausstellungsdatum)
-- wird vom Nutzer beim Erzeugen gesetzt (Default heute). Bestandszeilen
-- werden per UPDATE auf das vorhandene created_at zurückgeführt, damit
-- keine Rechnung ohne gültiges Datum existiert.
ALTER TABLE `rechnungen` ADD COLUMN `rechnungsdatum` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `rechnungen` SET `rechnungsdatum` = `created_at` WHERE `rechnungsdatum` = 0;
