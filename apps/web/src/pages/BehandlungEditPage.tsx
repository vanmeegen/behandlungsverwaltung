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
import { useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BeStepper } from '../components/BeStepper';
import type { BehandlungStore } from '../models/BehandlungStore';

interface BehandlungEditPageProps {
  behandlungStore: BehandlungStore;
}

export const BehandlungEditPage = observer(({ behandlungStore }: BehandlungEditPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const draft = behandlungStore.editDraftBehandlung;

  useEffect(() => {
    if (!id) return;
    behandlungStore.loadEditDraft(id);
    return (): void => {
      behandlungStore.resetEditDraft();
    };
  }, [id, behandlungStore, behandlungStore.byTherapie]);

  if (!behandlungStore.editLoaded) {
    return <Typography>Behandlung wird geladen…</Typography>;
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!id) return;
    const result = await behandlungStore.saveEditDraft(id);
    if (result) {
      navigate('/behandlungen');
    }
  };

  return (
    <Box data-testselector="behandlung-edit-page">
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Behandlung bearbeiten
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Datum"
            type="date"
            value={draft.datum}
            onChange={(e): void => draft.setDatum(e.target.value)}
            inputProps={{ 'data-testselector': 'behandlung-edit-datum' }}
            InputLabelProps={{ shrink: true }}
          />
          <BeStepper
            value={draft.be}
            onIncrement={draft.incrementBe}
            onDecrement={draft.decrementBe}
            testPrefix="behandlung-edit-be"
          />
          <TextField
            select
            label="Tätigkeit"
            value={draft.taetigkeit}
            onChange={(e): void => draft.setTaetigkeit(e.target.value as TaetigkeitValue | '')}
            inputProps={{ 'data-testselector': 'behandlung-edit-taetigkeit' }}
          >
            <MenuItem value="">— keine —</MenuItem>
            {TAETIGKEIT_VALUES.map((v) => (
              <MenuItem key={v} value={v}>
                {TAETIGKEIT_LABELS[v]}
              </MenuItem>
            ))}
          </TextField>
          {draft.taetigkeit === 'sonstiges' && (
            <TextField
              label="Beschreibung (max. 35 Zeichen)"
              value={draft.sonstigesText}
              onChange={(e): void => draft.setSonstigesText(e.target.value)}
              inputProps={{
                'data-testselector': 'behandlung-edit-sonstiges-text',
                maxLength: 35,
              }}
            />
          )}
          <Stack direction="row" spacing={1}>
            <Button type="submit" data-testselector="behandlung-edit-submit">
              Speichern
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={(): void => {
                navigate(-1);
              }}
              data-testselector="behandlung-edit-abbrechen"
            >
              Abbrechen
            </Button>
          </Stack>
          {behandlungStore.error && (
            <Alert severity="error" role="alert">
              {behandlungStore.error}
            </Alert>
          )}
        </Stack>
      </Box>
    </Box>
  );
});
