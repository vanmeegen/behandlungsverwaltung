import {
  TAETIGKEIT_LABELS,
  TAETIGKEIT_VALUES,
  type TaetigkeitValue,
} from '@behandlungsverwaltung/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BeStepper } from '../components/BeStepper';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { BehandlungStore } from '../models/BehandlungStore';
import type { KindStore } from '../models/KindStore';
import type { TherapieStore } from '../models/TherapieStore';

interface SchnellerfassungPageProps {
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
  behandlungStore: BehandlungStore;
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

export const SchnellerfassungPage = observer(
  ({ kindStore, auftraggeberStore, therapieStore, behandlungStore }: SchnellerfassungPageProps) => {
    const navigate = useNavigate();
    const { draftBehandlung: draft } = behandlungStore;

    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
      void therapieStore.load();
    }, [kindStore, auftraggeberStore, therapieStore]);

    const therapienForKind = draft.kindId
      ? therapieStore.items.filter((t) => t.kindId === draft.kindId)
      : [];

    const onTherapieChange = (id: string): void => {
      const t = therapieStore.items.find((tx) => tx.id === id);
      draft.setTherapie(id, t?.taetigkeit ?? null);
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await behandlungStore.saveDraft();
      if (saved) {
        draft.reset();
        navigate('/');
      }
    };

    return (
      <Box data-testselector="schnellerfassung-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Behandlung erfassen
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              select
              label="Kind"
              value={draft.kindId}
              onChange={(e): void => draft.setKindId(e.target.value)}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'schnellerfassung-kindId' },
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
              label="Therapie"
              value={draft.therapieId}
              onChange={(e): void => onTherapieChange(e.target.value)}
              disabled={!draft.kindId}
              SelectProps={{
                native: true,
                inputProps: { 'data-testselector': 'schnellerfassung-therapieId' },
              }}
              InputLabelProps={{ shrink: true }}
              error={Boolean(draft.errors.therapieId)}
              helperText={
                draft.errors.therapieId ? (
                  <span role="alert" data-testselector="schnellerfassung-therapieId-error">
                    {draft.errors.therapieId}
                  </span>
                ) : null
              }
            >
              <option value="">– bitte wählen –</option>
              {therapienForKind.map((t) => {
                const ag = auftraggeberStore.items.find((a) => a.id === t.auftraggeberId);
                const label = `${t.form}${ag ? ` · ${auftraggeberLabel(ag)}` : ''}`;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </TextField>

            <Box>
              <Typography component="span" sx={{ mr: 2 }}>
                Behandlungseinheiten
              </Typography>
              <BeStepper
                value={draft.be}
                onIncrement={draft.incrementBe}
                onDecrement={draft.decrementBe}
                testPrefix="schnellerfassung-be"
              />
            </Box>

            <TextField
              label="Datum"
              type="date"
              value={draft.datum}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => draft.setDatum(e.target.value)}
              inputProps={{ 'data-testselector': 'schnellerfassung-datum' }}
              InputLabelProps={{ shrink: true }}
              error={Boolean(draft.errors.datum)}
              helperText={
                draft.errors.datum ? (
                  <span role="alert" data-testselector="schnellerfassung-datum-error">
                    {draft.errors.datum}
                  </span>
                ) : null
              }
            />

            <TextField
              select
              label="Tätigkeit"
              value={draft.taetigkeit}
              onChange={(e): void =>
                draft.setTaetigkeit(
                  e.target.value === '' ? '' : (e.target.value as TaetigkeitValue),
                )
              }
              inputProps={{ 'data-testselector': 'schnellerfassung-taetigkeit' }}
              error={Boolean(draft.errors.taetigkeit)}
              helperText={
                draft.errors.taetigkeit ? (
                  <span role="alert" data-testselector="schnellerfassung-taetigkeit-error">
                    {draft.errors.taetigkeit}
                  </span>
                ) : null
              }
            >
              <MenuItem value="">— bitte wählen —</MenuItem>
              {TAETIGKEIT_VALUES.map((value) => (
                <MenuItem key={value} value={value}>
                  {TAETIGKEIT_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>

            <Button type="submit" data-testselector="schnellerfassung-submit">
              Speichern
            </Button>

            {behandlungStore.error && (
              <Alert
                severity="error"
                role="alert"
                data-testselector="schnellerfassung-server-error"
              >
                {behandlungStore.error}
              </Alert>
            )}
          </Stack>
        </Box>
      </Box>
    );
  },
);
