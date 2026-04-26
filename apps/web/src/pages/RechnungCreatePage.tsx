import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { RechnungStore } from '../models/RechnungStore';

interface RechnungCreatePageProps {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  rechnungStore: RechnungStore;
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

export const RechnungCreatePage = observer(
  ({ kindStore, auftraggeberStore, rechnungStore }: RechnungCreatePageProps) => {
    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
    }, [kindStore, auftraggeberStore]);

    const { draftRechnung: draft } = rechnungStore;

    // PRD §3.2 / AC-RECH-15: Vorbelegung der laufenden Nummer (NNNN)
    // beim Mount und bei Wechsel des Jahres — nur wenn der Nutzer den
    // Wert noch nicht angepasst hat (`lfdNummerTouched === false`).
    useEffect(() => {
      void rechnungStore.loadNextFreeLfdNummer(draft.year);
    }, [rechnungStore, draft.year]);

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      await rechnungStore.saveDraft();
    };

    const onMonthChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const raw = event.target.value;
      if (!/^\d{4}-\d{2}$/.test(raw)) return;
      const [y, m] = raw.split('-') as [string, string];
      draft.setYear(Number.parseInt(y, 10));
      draft.setMonth(Number.parseInt(m, 10));
    };

    const monthValue = `${draft.year}-${String(draft.month).padStart(2, '0')}`;
    const duplicate = rechnungStore.error?.code === 'DUPLICATE_RECHNUNG';
    const prefix = `RE-${draft.year}-${String(draft.month).padStart(2, '0')}-`;
    const lfdValue = String(draft.lfdNummer).padStart(4, '0');

    const onLfdChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const raw = event.target.value.replace(/\D+/g, '').slice(0, 4);
      const parsed = raw.length === 0 ? 0 : Number.parseInt(raw, 10);
      draft.setLfdNummer(parsed);
    };

    return (
      <Box data-testselector="rechnung-create-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Rechnung erstellen
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Abrechnungsmonat"
              type="month"
              value={monthValue}
              onChange={onMonthChange}
              inputProps={{ 'data-testselector': 'rechnung-create-monat' }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Rechnungsdatum"
              type="date"
              value={draft.rechnungsdatum}
              onChange={(e): void => draft.setRechnungsdatum(e.target.value)}
              inputProps={{ 'data-testselector': 'rechnung-create-rechnungsdatum' }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Rechnungsnummer"
              value={lfdValue}
              onChange={onLfdChange}
              helperText="Nur die laufende Nummer (NNNN) ist editierbar."
              inputProps={{
                'data-testselector': 'rechnung-create-lfd',
                inputMode: 'numeric',
                maxLength: 4,
                pattern: '[0-9]*',
              }}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    data-testselector="rechnung-create-prefix"
                    disableTypography
                  >
                    {prefix}
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              label="Kind"
              value={draft.kindId}
              onChange={(e): void => draft.setKindId(e.target.value)}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'rechnung-create-kindId' },
              }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">– bitte wählen –</option>
              {kindStore.items.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nachname}, {k.vorname}
                </option>
              ))}
            </TextField>

            <TextField
              select
              label="Auftraggeber"
              value={draft.auftraggeberId}
              onChange={(e): void => draft.setAuftraggeberId(e.target.value)}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'rechnung-create-auftraggeberId' },
              }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">– bitte wählen –</option>
              {auftraggeberStore.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {auftraggeberLabel(a)}
                </option>
              ))}
            </TextField>

            <Button type="submit" data-testselector="rechnung-create-submit">
              Rechnung erzeugen
            </Button>
          </Stack>
        </Box>

        {rechnungStore.lastCreated && (
          <Alert
            severity="success"
            role="status"
            data-testselector="rechnung-create-success"
            sx={{ mt: 2 }}
          >
            {`Rechnung erstellt: ${rechnungStore.lastCreated.nummer} — `}
            <a
              href={`/bills/${rechnungStore.lastCreated.dateiname}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testselector="rechnung-create-success-link"
            >
              Rechnung öffnen
            </a>
          </Alert>
        )}

        <ConfirmDialog
          open={duplicate}
          title="Rechnung neu erzeugen?"
          message="Für diesen Monat wurde bereits eine Rechnung erzeugt — neu erzeugen?"
          confirmLabel="Ja"
          cancelLabel="Abbrechen"
          testSelector="duplicate-confirm"
          onCancel={(): void => rechnungStore.dismissError()}
          onConfirm={async (): Promise<void> => {
            rechnungStore.dismissError();
            await rechnungStore.saveDraft({ force: true });
          }}
        />

        {rechnungStore.error?.code === 'KEINE_BEHANDLUNGEN' && (
          <Alert
            severity="warning"
            role="alert"
            data-testselector="keine-behandlungen"
            sx={{ mt: 2 }}
          >
            {rechnungStore.error.message}
          </Alert>
        )}

        {rechnungStore.error?.code === 'DUPLICATE_RECHNUNGSNUMMER' && (
          <Alert
            severity="error"
            role="alert"
            data-testselector="rechnung-create-duplicate-nummer"
            sx={{ mt: 2 }}
          >
            {rechnungStore.error.message}
          </Alert>
        )}

        {rechnungStore.error &&
          rechnungStore.error.code !== 'DUPLICATE_RECHNUNG' &&
          rechnungStore.error.code !== 'DUPLICATE_RECHNUNGSNUMMER' &&
          rechnungStore.error.code !== 'KEINE_BEHANDLUNGEN' && (
            <Alert
              severity="error"
              role="alert"
              data-testselector="rechnung-create-error"
              sx={{ mt: 2 }}
            >
              {rechnungStore.error.message}
            </Alert>
          )}
      </Box>
    );
  },
);
