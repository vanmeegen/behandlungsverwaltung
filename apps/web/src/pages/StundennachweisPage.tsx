import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { StundennachweisStore } from '../models/StundennachweisStore';
import type { TherapieStore } from '../models/TherapieStore';

interface StundennachweisPageProps {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  stundennachweisStore: StundennachweisStore;
  therapieStore: TherapieStore;
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

export const StundennachweisPage = observer(
  ({
    kindStore,
    auftraggeberStore,
    stundennachweisStore,
    therapieStore,
  }: StundennachweisPageProps) => {
    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
      void therapieStore.load();
    }, [kindStore, auftraggeberStore, therapieStore]);

    const draft = stundennachweisStore.draftStundennachweis;

    // Auftraggeber-Dropdown auf jene filtern, für die zum gewählten Kind
    // eine Therapie hinterlegt ist.
    const erlaubteAgIds = new Set(
      therapieStore.items.filter((t) => t.kindId === draft.kindId).map((t) => t.auftraggeberId),
    );
    const auftraggeberOptions = draft.kindId
      ? auftraggeberStore.items.filter((a) => erlaubteAgIds.has(a.id))
      : [];

    const onKindChange = (newKindId: string): void => {
      draft.setKindId(newKindId);
      const allowed = new Set(
        therapieStore.items.filter((t) => t.kindId === newKindId).map((t) => t.auftraggeberId),
      );
      if (draft.auftraggeberId && !allowed.has(draft.auftraggeberId)) {
        draft.setAuftraggeberId('');
      }
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      await stundennachweisStore.saveDraft();
    };

    const onMonthChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const raw = event.target.value;
      if (!/^\d{4}-\d{2}$/.test(raw)) return;
      const [y, m] = raw.split('-') as [string, string];
      draft.setYear(Number.parseInt(y, 10));
      draft.setMonth(Number.parseInt(m, 10));
    };

    const monthValue = `${draft.year}-${String(draft.month).padStart(2, '0')}`;

    return (
      <Box data-testselector="stundennachweis-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Stundennachweis drucken
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Abrechnungsmonat"
              type="month"
              value={monthValue}
              onChange={onMonthChange}
              inputProps={{ 'data-testselector': 'stundennachweis-monat' }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Kind"
              value={draft.kindId}
              onChange={(e): void => onKindChange(e.target.value)}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'stundennachweis-kindId' },
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
                inputProps: { 'data-testselector': 'stundennachweis-auftraggeberId' },
              }}
              InputLabelProps={{ shrink: true }}
              disabled={!draft.kindId}
            >
              <option value="">– bitte wählen –</option>
              {auftraggeberOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {auftraggeberLabel(a)}
                </option>
              ))}
            </TextField>

            <Button type="submit" data-testselector="stundennachweis-submit">
              Stundennachweis drucken
            </Button>
          </Stack>
        </Box>

        {stundennachweisStore.lastCreated && (
          <Alert
            severity="success"
            role="status"
            data-testselector="stundennachweis-success"
            sx={{ mt: 2 }}
          >
            Stundennachweis erstellt: {stundennachweisStore.lastCreated.dateiname}
          </Alert>
        )}

        {stundennachweisStore.error && (
          <Alert
            severity="error"
            role="alert"
            data-testselector="stundennachweis-error"
            sx={{ mt: 2 }}
          >
            {stundennachweisStore.error.message}
          </Alert>
        )}
      </Box>
    );
  },
);
