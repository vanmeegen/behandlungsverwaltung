ALTER TABLE `auftraggeber` ADD `abteilung` text;--> statement-breakpoint
ALTER TABLE `auftraggeber` ADD `rechnungskopf_text` text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE auftraggeber SET rechnungskopf_text = 'Mein Honorar für die Teilmaßnahme … betrug im Monat …:' WHERE rechnungskopf_text = '';
