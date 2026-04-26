-- Nulls out any taetigkeit/snapshot_taetigkeit value that is not a valid TAETIGKEIT
-- enum member. These are legacy free-text arbeitsthema values left over from migration
-- 0002 which renamed the column but did not transform the stored strings.
UPDATE behandlungen
  SET taetigkeit = NULL
  WHERE taetigkeit IS NOT NULL
    AND taetigkeit NOT IN (
      'dyskalkulie','lerntherapie','lrs_therapie','resilienztraining',
      'heilpaedagogik','elternberatung','sonstiges',
      'elterngespraech','lehrergespraech','bericht','foerderplan','teamberatung'
    );--> statement-breakpoint
UPDATE therapien
  SET taetigkeit = NULL
  WHERE taetigkeit IS NOT NULL
    AND taetigkeit NOT IN (
      'dyskalkulie','lerntherapie','lrs_therapie','resilienztraining',
      'heilpaedagogik','elternberatung','sonstiges',
      'elterngespraech','lehrergespraech','bericht','foerderplan','teamberatung'
    );--> statement-breakpoint
UPDATE rechnung_behandlungen
  SET snapshot_taetigkeit = NULL
  WHERE snapshot_taetigkeit IS NOT NULL
    AND snapshot_taetigkeit NOT IN (
      'dyskalkulie','lerntherapie','lrs_therapie','resilienztraining',
      'heilpaedagogik','elternberatung','sonstiges',
      'elterngespraech','lehrergespraech','bericht','foerderplan','teamberatung'
    );
