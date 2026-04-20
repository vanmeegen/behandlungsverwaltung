CREATE TABLE `auftraggeber` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`typ` text NOT NULL,
	`firmenname` text,
	`vorname` text,
	`nachname` text,
	`strasse` text NOT NULL,
	`hausnummer` text NOT NULL,
	`plz` text NOT NULL,
	`stadt` text NOT NULL,
	`stundensatz_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `behandlungen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`therapie_id` integer NOT NULL,
	`datum` integer NOT NULL,
	`be` integer NOT NULL,
	`arbeitsthema` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`therapie_id`) REFERENCES `therapien`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kinder` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vorname` text NOT NULL,
	`nachname` text NOT NULL,
	`geburtsdatum` integer NOT NULL,
	`strasse` text NOT NULL,
	`hausnummer` text NOT NULL,
	`plz` text NOT NULL,
	`stadt` text NOT NULL,
	`aktenzeichen` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `therapien` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind_id` integer NOT NULL,
	`auftraggeber_id` integer NOT NULL,
	`form` text NOT NULL,
	`kommentar` text,
	`bewilligte_be` integer NOT NULL,
	`arbeitsthema` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`kind_id`) REFERENCES `kinder`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auftraggeber_id`) REFERENCES `auftraggeber`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rechnungen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nummer` text NOT NULL,
	`jahr` integer NOT NULL,
	`monat` integer NOT NULL,
	`kind_id` integer NOT NULL,
	`auftraggeber_id` integer NOT NULL,
	`stundensatz_cents_snapshot` integer NOT NULL,
	`gesamt_cents` integer NOT NULL,
	`dateiname` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`kind_id`) REFERENCES `kinder`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auftraggeber_id`) REFERENCES `auftraggeber`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rechnungen_nummer_unique` ON `rechnungen` (`nummer`);--> statement-breakpoint
CREATE UNIQUE INDEX `rechnungen_jahr_monat_kind_auftraggeber_unique` ON `rechnungen` (`jahr`,`monat`,`kind_id`,`auftraggeber_id`);--> statement-breakpoint
CREATE TABLE `rechnung_behandlungen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rechnung_id` integer NOT NULL,
	`behandlung_id` integer NOT NULL,
	`snapshot_date` integer NOT NULL,
	`snapshot_be` integer NOT NULL,
	`snapshot_arbeitsthema` text,
	`snapshot_zeilenbetrag_cents` integer NOT NULL,
	FOREIGN KEY (`rechnung_id`) REFERENCES `rechnungen`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`behandlung_id`) REFERENCES `behandlungen`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `template_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`auftraggeber_id` integer,
	`filename` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`auftraggeber_id`) REFERENCES `auftraggeber`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `template_files_kind_auftraggeber_unique` ON `template_files` (`kind`,`auftraggeber_id`);