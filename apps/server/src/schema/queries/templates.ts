import { asc } from 'drizzle-orm';
import { templateFiles } from '../../db/schema';
import { builder } from '../builder';
import { TemplateFileRef } from '../types/templateFile';

builder.queryField('templateFiles', (t) =>
  t.field({
    type: [TemplateFileRef],
    description: 'All template files (PRD §5).',
    resolve: (_parent, _args, { db }) =>
      db.select().from(templateFiles).orderBy(asc(templateFiles.id)).all(),
  }),
);
