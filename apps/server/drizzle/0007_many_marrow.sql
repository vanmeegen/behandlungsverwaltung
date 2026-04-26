ALTER TABLE `therapien` ADD `startdatum` integer NOT NULL DEFAULT (unixepoch() * 1000);--> statement-breakpoint
UPDATE `therapien`
  SET `startdatum` = COALESCE(
    (SELECT MIN(b.datum) FROM behandlungen b WHERE b.therapie_id = therapien.id),
    therapien.created_at
  )
  WHERE 1=1;
