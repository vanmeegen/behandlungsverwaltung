// Embed the drizzle migrations so `bun build --compile` can ship them
// inside the standalone binary. At runtime we materialize them into a
// temp dir and hand that dir to drizzle's migrate().
import journalPath from '../../drizzle/meta/_journal.json' with { type: 'file' };
import migration0000Path from '../../drizzle/0000_organic_franklin_storm.sql' with { type: 'file' };
import migration0001Path from '../../drizzle/0001_panoramic_chimera.sql' with { type: 'file' };
import migration0002Path from '../../drizzle/0002_rename_arbeitsthema_to_taetigkeit.sql' with { type: 'file' };
import migration0003Path from '../../drizzle/0003_add_rechnungsdatum.sql' with { type: 'file' };
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const asPath = (v: unknown): string => v as string;

interface EmbeddedMigrationFile {
  readonly relativePath: string;
  readonly embeddedPath: string;
}

const EMBEDDED_MIGRATIONS: readonly EmbeddedMigrationFile[] = [
  { relativePath: 'meta/_journal.json', embeddedPath: asPath(journalPath) },
  { relativePath: '0000_organic_franklin_storm.sql', embeddedPath: asPath(migration0000Path) },
  { relativePath: '0001_panoramic_chimera.sql', embeddedPath: asPath(migration0001Path) },
  {
    relativePath: '0002_rename_arbeitsthema_to_taetigkeit.sql',
    embeddedPath: asPath(migration0002Path),
  },
  { relativePath: '0003_add_rechnungsdatum.sql', embeddedPath: asPath(migration0003Path) },
];

export function materializeEmbeddedMigrations(): string {
  const dir = mkdtempSync(join(tmpdir(), 'behandlungsverwaltung-drizzle-'));
  for (const { relativePath, embeddedPath } of EMBEDDED_MIGRATIONS) {
    const destination = join(dir, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(embeddedPath));
  }
  return dir;
}
