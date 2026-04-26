import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, type ChangeEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { TemplateKindValue, TemplateStore } from '../models/TemplateStore';

interface TemplateUploadPageProps {
  templateStore: TemplateStore;
  auftraggeberStore: AuftraggeberStore;
}

class TemplateUploadDraft {
  kind: TemplateKindValue = 'rechnung';
  auftraggeberId = '';
  uploading = false;
  snackbarOpen = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setKind(v: TemplateKindValue): void {
    this.kind = v;
  }
  setAuftraggeberId(v: string): void {
    this.auftraggeberId = v;
  }
  setUploading(v: boolean): void {
    this.uploading = v;
  }
  setSnackbarOpen(v: boolean): void {
    this.snackbarOpen = v;
  }
  setError(msg: string | null): void {
    this.error = msg;
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      void auftraggeberStore.load();
      void templateStore.load();
    }, [auftraggeberStore, templateStore]);

    const onFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file) return;
      draft.setError(null);
      draft.setUploading(true);
      try {
        const base64 = await readFileAsBase64(file);
        const saved = await templateStore.upload({
          kind: draft.kind,
          auftraggeberId: draft.auftraggeberId,
          base64,
        });
        if (saved) {
          draft.setSnackbarOpen(true);
          void templateStore.load();
        } else if (templateStore.error) {
          draft.setError(templateStore.error);
        }
      } catch (err) {
        draft.setError(err instanceof Error ? err.message : 'Upload-Fehler');
      } finally {
        draft.setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    return (
      <Box data-testselector="template-upload-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Vorlagen-Verwaltung
        </Typography>

        <Stack spacing={2} sx={{ mb: 4 }}>
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

          <Box>
            <Button
              variant="outlined"
              aria-busy={draft.uploading}
              startIcon={draft.uploading ? <CircularProgress size={16} /> : undefined}
              onClick={(): void => fileInputRef.current?.click()}
              data-testselector="template-upload-file-btn"
              disabled={draft.uploading}
            >
              {draft.uploading ? 'Hochladen…' : 'PDF-Datei hochladen'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              data-testselector="template-upload-file"
              onChange={onFileChange}
            />
          </Box>

          {draft.error && (
            <Alert severity="error" role="alert" data-testselector="template-upload-error">
              {draft.error}
            </Alert>
          )}
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            Vorhandene Vorlagen
          </Typography>
          {templateStore.items.length === 0 ? (
            <Typography data-testselector="template-list-empty" color="text.secondary">
              Noch keine Vorlagen vorhanden.
            </Typography>
          ) : (
            <Table data-testselector="template-list">
              <TableHead>
                <TableRow>
                  <TableCell>Geltungsbereich</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Datei</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {templateStore.items.map((tpl) => {
                  const ag = tpl.auftraggeberId
                    ? auftraggeberStore.items.find((a) => a.id === tpl.auftraggeberId)
                    : null;
                  const scope = ag ? auftraggeberLabel(ag) : 'Global';
                  return (
                    <TableRow
                      key={tpl.id}
                      data-testselector={`template-row-${tpl.kind}-${tpl.auftraggeberId ?? 'global'}`}
                    >
                      <TableCell>{scope}</TableCell>
                      <TableCell>{tpl.kind}</TableCell>
                      <TableCell>
                        <a
                          href={`/templates/${tpl.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {tpl.filename}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={(): void => {
                            void templateStore.load();
                          }}
                        >
                          Entfernen
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>

        <Snackbar
          open={draft.snackbarOpen}
          autoHideDuration={3000}
          onClose={(): void => draft.setSnackbarOpen(false)}
          message="Vorlage hochgeladen"
          data-testselector="template-upload-snackbar"
        />
      </Box>
    );
  },
);
