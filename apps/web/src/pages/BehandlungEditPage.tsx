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
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BeStepper } from '../components/BeStepper';
import type { BehandlungStore, BehandlungFormInput } from '../models/BehandlungStore';

interface BehandlungEditPageProps {
  behandlungStore: BehandlungStore;
}

export const BehandlungEditPage = observer(({ behandlungStore }: BehandlungEditPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [datum, setDatum] = useState('');
  const [be, setBe] = useState(1);
  const [taetigkeit, setTaetigkeit] = useState<TaetigkeitValue | ''>('');
  const [gruppentherapie, setGruppentherapie] = useState(false);
  const [sonstigesText, setSonstigesText] = useState('');
  const [therapieId, setTherapieId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const allBehandlungen = Object.values(behandlungStore.byTherapie).flat();
    const b = allBehandlungen.find((b) => b.id === id);
    if (b) {
      setDatum(b.datum.slice(0, 10));
      setBe(b.be);
      setTaetigkeit((b.taetigkeit ?? '') as TaetigkeitValue | '');
      setGruppentherapie(b.gruppentherapie);
      setSonstigesText(b.sonstigesText ?? '');
      setTherapieId(b.therapieId);
      setLoaded(true);
    }
  }, [id, behandlungStore.byTherapie]);

  if (!loaded) {
    return <Typography>Behandlung wird geladen…</Typography>;
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!id) return;
    const input: BehandlungFormInput = {
      therapieId,
      datum,
      be,
      taetigkeit: taetigkeit === '' ? null : (taetigkeit as TaetigkeitValue),
      gruppentherapie,
      sonstigesText: taetigkeit === 'sonstiges' ? sonstigesText || null : null,
    };
    const result = await behandlungStore.update(id, input);
    if (result) {
      navigate('/behandlungen');
    } else {
      setError(behandlungStore.error);
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
            value={datum}
            onChange={(e): void => setDatum(e.target.value)}
            inputProps={{ 'data-testselector': 'behandlung-edit-datum' }}
            InputLabelProps={{ shrink: true }}
          />
          <BeStepper
            value={be}
            onIncrement={(): void => setBe((v) => v + 1)}
            onDecrement={(): void => setBe((v) => Math.max(1, v - 1))}
            testPrefix="behandlung-edit-be"
          />
          <TextField
            select
            label="Tätigkeit"
            value={taetigkeit}
            onChange={(e): void => {
              setTaetigkeit(e.target.value as TaetigkeitValue | '');
              if (e.target.value !== 'sonstiges') setSonstigesText('');
            }}
            inputProps={{ 'data-testselector': 'behandlung-edit-taetigkeit' }}
          >
            <MenuItem value="">— keine —</MenuItem>
            {TAETIGKEIT_VALUES.map((v) => (
              <MenuItem key={v} value={v}>
                {TAETIGKEIT_LABELS[v]}
              </MenuItem>
            ))}
          </TextField>
          {taetigkeit === 'sonstiges' && (
            <TextField
              label="Beschreibung (max. 35 Zeichen)"
              value={sonstigesText}
              onChange={(e): void => setSonstigesText(e.target.value)}
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
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
        </Stack>
      </Box>
    </Box>
  );
});
