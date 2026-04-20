import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { TemplateKindValue, TemplateStore } from '../models/TemplateStore';

interface TemplateUploadPageProps {
  templateStore: TemplateStore;
  auftraggeberStore: AuftraggeberStore;
}

class TemplateUploadDraft {
  kind: TemplateKindValue = 'rechnung';
  auftraggeberId = '';
  file: File | null = null;
  fileName = '';
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, { file: false }, { autoBind: true });
  }

  setKind(v: TemplateKindValue): void {
    this.kind = v;
  }
  setAuftraggeberId(v: string): void {
    this.auftraggeberId = v;
  }
  setFile(f: File): void {
    this.file = f;
    this.fileName = f.name;
    this.error = null;
  }
  setError(msg: string): void {
    this.error = msg;
  }
  reset(): void {
    this.kind = 'rechnung';
    this.auftraggeberId = '';
    this.file = null;
    this.fileName = '';
    this.error = null;
  }
}

const draft = new TemplateUploadDraft();

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Datei konnte nicht gelesen werden'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = (): void => reject(reader.error ?? new Error('FileReader-Fehler'));
    reader.readAsDataURL(file);
  });
}

function auftraggeberLabel(ag: {
  typ: 'firma' | 'person';
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
}): string {
  if (ag.typ === 'firma') return ag.firmenname ?? '';
  return `${ag.nachname ?? ''}, ${ag.vorname ?? ''}`;
}

export const TemplateUploadPage = observer(
  ({ templateStore, auftraggeberStore }: TemplateUploadPageProps) => {
    useEffect(() => {
      void auftraggeberStore.load();
      void templateStore.load();
    }, [auftraggeberStore, templateStore]);

    const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];
      if (!file) return;
      draft.setFile(file);
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (!draft.file) {
        draft.setError('Bitte eine PDF-Datei auswählen');
        return;
      }
      const base64 = await readFileAsBase64(draft.file);
      const saved = await templateStore.upload({
        kind: draft.kind,
        auftraggeberId: draft.auftraggeberId,
        base64,
      });
      if (saved) {
        draft.reset();
      }
    };

    return (
      <section data-testselector="template-upload-page">
        <h1>PDF-Vorlage hochladen</h1>
        <form onSubmit={onSubmit}>
          <label>
            Art
            <select
              data-testselector="template-upload-kind"
              value={draft.kind}
              onChange={(e): void => draft.setKind(e.target.value as TemplateKindValue)}
            >
              <option value="rechnung">Rechnung</option>
              <option value="stundennachweis">Stundennachweis</option>
            </select>
          </label>

          <label>
            Auftraggeber (leer = global)
            <select
              data-testselector="template-upload-auftraggeberId"
              value={draft.auftraggeberId}
              onChange={(e): void => draft.setAuftraggeberId(e.target.value)}
            >
              <option value="">– global –</option>
              {auftraggeberStore.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {auftraggeberLabel(a)}
                </option>
              ))}
            </select>
          </label>

          <label>
            PDF-Datei
            <input
              key={templateStore.items.length}
              type="file"
              accept="application/pdf"
              data-testselector="template-upload-file"
              onChange={onFileChange}
            />
          </label>

          <button type="submit" data-testselector="template-upload-submit">
            Hochladen
          </button>

          {draft.error && (
            <p role="alert" data-testselector="template-upload-error">
              {draft.error}
            </p>
          )}
          {templateStore.error && (
            <p role="alert" data-testselector="template-upload-server-error">
              {templateStore.error}
            </p>
          )}
          {draft.fileName && !templateStore.error && !draft.error && (
            <p data-testselector="template-upload-file-name">{draft.fileName}</p>
          )}
        </form>

        <section>
          <h2>Vorhandene Vorlagen</h2>
          {templateStore.items.length === 0 ? (
            <p data-testselector="template-list-empty">Noch keine Vorlagen vorhanden.</p>
          ) : (
            <ul data-testselector="template-list">
              {templateStore.items.map((tpl) => (
                <li
                  key={tpl.id}
                  data-testselector={`template-row-${tpl.kind}-${tpl.auftraggeberId ?? 'global'}`}
                >
                  {tpl.kind} · {tpl.auftraggeberId ?? 'global'} · {tpl.filename}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    );
  },
);
