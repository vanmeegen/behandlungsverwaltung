import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type TemplateKindValue = 'rechnung' | 'stundennachweis';

export interface TemplateFileRow {
  id: string;
  kind: TemplateKindValue;
  auftraggeberId: string | null;
  filename: string;
}

export interface UploadTemplateArgs {
  kind: TemplateKindValue;
  auftraggeberId: string;
  base64: string;
}

const TEMPLATE_COLUMNS = /* GraphQL */ `
  id
  kind
  auftraggeberId
  filename
`;

const UPLOAD_TEMPLATE = /* GraphQL */ `
  mutation UploadTemplate($input: UploadTemplateInput!) {
    uploadTemplate(input: $input) {
      ${TEMPLATE_COLUMNS}
    }
  }
`;

const TEMPLATE_FILES_QUERY = /* GraphQL */ `
  query TemplateFiles {
    templateFiles {
      ${TEMPLATE_COLUMNS}
    }
  }
`;

export class TemplateStore {
  items: TemplateFileRow[] = [];
  error: string | null = null;
  loading = false;

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.fetcher<{ templateFiles: TemplateFileRow[] }>(TEMPLATE_FILES_QUERY);
      runInAction(() => {
        this.items = data.templateFiles;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async upload(args: UploadTemplateArgs): Promise<TemplateFileRow | null> {
    this.error = null;
    const input = {
      kind: args.kind,
      auftraggeberId: args.auftraggeberId.trim() === '' ? null : args.auftraggeberId,
      base64: args.base64,
    };
    try {
      const data = await this.fetcher<{ uploadTemplate: TemplateFileRow }>(UPLOAD_TEMPLATE, {
        input,
      });
      runInAction(() => {
        const idx = this.items.findIndex(
          (t) =>
            t.kind === data.uploadTemplate.kind &&
            t.auftraggeberId === data.uploadTemplate.auftraggeberId,
        );
        if (idx >= 0) {
          this.items = [
            ...this.items.slice(0, idx),
            data.uploadTemplate,
            ...this.items.slice(idx + 1),
          ];
        } else {
          this.items = [...this.items, data.uploadTemplate];
        }
      });
      return data.uploadTemplate;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }
}
