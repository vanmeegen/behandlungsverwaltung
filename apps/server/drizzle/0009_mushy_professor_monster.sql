CREATE TABLE `erziehungsberechtigte` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`vorname` text NOT NULL,
	`nachname` text NOT NULL,
	`strasse` text,
	`hausnummer` text,
	`plz` text,
	`stadt` text,
	`email1` text,
	`email2` text,
	`telefon1` text,
	`telefon2` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`kind_id`) REFERENCES `kinder`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "slot_check" CHECK("erziehungsberechtigte"."slot" IN (1, 2))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `erziehungsberechtigte_kind_id_slot_unique` ON `erziehungsberechtigte` (`kind_id`,`slot`);