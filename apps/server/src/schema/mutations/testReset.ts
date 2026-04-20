/**
 * Test-only mutation. Registered only when BEHANDLUNG_TEST_MODE=1 (Risks R3).
 * A server started in test mode also uses app-test.db (see resolveDbPath),
 * so this never touches the dev/production app.db.
 */
import {
  auftraggeber,
  behandlungen,
  kinder,
  rechnungBehandlungen,
  rechnungen,
  templateFiles,
  therapien,
} from '../../db/schema';
import { builder } from '../builder';

if (Bun.env.BEHANDLUNG_TEST_MODE === '1') {
  builder.mutationField('testReset', (t) =>
    t.boolean({
      description: 'Clears every domain table. Only registered when BEHANDLUNG_TEST_MODE=1.',
      resolve: (_parent, _args, { db }) => {
        db.delete(rechnungBehandlungen).run();
        db.delete(rechnungen).run();
        db.delete(behandlungen).run();
        db.delete(therapien).run();
        db.delete(templateFiles).run();
        db.delete(auftraggeber).run();
        db.delete(kinder).run();
        return true;
      },
    }),
  );
}
