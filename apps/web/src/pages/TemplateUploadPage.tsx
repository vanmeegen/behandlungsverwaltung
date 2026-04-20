import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
      <Box data-testselector="template-upload-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          PDF-Vorlage hochladen
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              select
              label="Art"
              value={draft.kind}
              onChange={(e): void => draft.setKind(e.target.value as TemplateKindValue)}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'template-upload-kind' },
              }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="rechnung">Rechnung</option>
              <option value="stundennachweis">Stundennachweis</option>
            </TextField>

            <TextField
              select
              label="Auftraggeber (leer = global)"
              value={draft.auftraggeberId}
              onChange={(e): void => draft.setAuftraggeberId(e.target.value)}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'template-upload-auftraggeberId' },
              }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">– global –</option>
              {auftraggeberStore.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {auftraggeberLabel(a)}
                </option>
              ))}
            </TextField>

            <Button component="label" variant="outlined">
              PDF-Datei auswählen
              <input
                key={templateStore.items.length}
                type="file"
                accept="application/pdf"
                hidden
                data-testselector="template-upload-file"
                onChange={onFileChange}
              />
            </Button>

            <Button type="submit" data-testselector="template-upload-submit">
              Hochladen
            </Button>

            {draft.error && (
              <Alert severity="error" role="alert" data-testselector="template-upload-error">
                {draft.error}
              </Alert>
            )}
            {templateStore.error && (
              <Alert severity="error" role="alert" data-testselector="template-upload-server-error">
                {templateStore.error}
              </Alert>
            )}
            {draft.fileName && !templateStore.error && !draft.error && (
              <Typography data-testselector="template-upload-file-name" color="text.secondary">
                {draft.fileName}
              </Typography>
            )}
          </Stack>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            Vorhandene Vorlagen
          </Typography>
          {templateStore.items.length === 0 ? (
            <Typography data-testselector="template-list-empty" color="text.secondary">
              Noch keine Vorlagen vorhanden.
            </Typography>
          ) : (
            <List data-testselector="template-list">
              {templateStore.items.map((tpl) => (
                <ListItem
                  key={tpl.id}
                  data-testselector={`template-row-${tpl.kind}-${tpl.auftraggeberId ?? 'global'}`}
                >
                  <ListItemText
                    primary={`${tpl.kind} · ${tpl.auftraggeberId ?? 'global'} · ${tpl.filename}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    );
  },
);
