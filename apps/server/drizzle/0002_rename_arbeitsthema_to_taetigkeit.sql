-- M3: umbenennen arbeitsthema → taetigkeit auf therapien, behandlungen
-- und rechnung_behandlungen. PRD §2.3/§2.4: neues Enum-Feld ersetzt das
-- bisherige Freitext-Feld. Freitext-Altwerte, die nicht zum Enum passen,
-- werden vom Code (Zod) beim Lesen auf NULL abgebildet — SQLite speichert
-- die Werte weiterhin als TEXT.
ALTER TABLE `therapien` RENAME COLUMN `arbeitsthema` TO `taetigkeit`;--> statement-breakpoint
ALTER TABLE `behandlungen` RENAME COLUMN `arbeitsthema` TO `taetigkeit`;--> statement-breakpoint
ALTER TABLE `rechnung_behandlungen` RENAME COLUMN `snapshot_arbeitsthema` TO `snapshot_taetigkeit`;
