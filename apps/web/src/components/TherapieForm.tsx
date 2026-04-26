import {
  TAETIGKEIT_LABELS,
  TAETIGKEIT_VALUES,
  THERAPIE_FORM_LABELS,
  type TaetigkeitValue,
} from '@behandlungsverwaltung/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { observer } from 'mobx-react-lite';
import type { FormEvent, InputHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import {
  THERAPIE_FORM_VALUES,
  type TherapieFieldErrors,
  type TherapieFormValue,
  type TherapieStore,
} from '../models/TherapieStore';

interface TherapieFormProps {
  therapieStore: TherapieStore;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
  redirectOnSuccess?: string;
}

function errorProps(
  errors: TherapieFieldErrors,
  field: keyof TherapieFieldErrors,
): {
  error: boolean;
  helperText: JSX.Element | null;
} {
  const message = errors[field];
  return {
    error: Boolean(message),
    helperText: message ? (
      <span role="alert" data-testselector={`therapie-form-${field}-error`}>
        {message}
      </span>
    ) : null,
  };
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

export const TherapieForm = observer(
  ({
    therapieStore,
    kindStore,
    auftraggeberStore,
    redirectOnSuccess = '/therapien',
  }: TherapieFormProps) => {
    const navigate = useNavigate();
    const { draftTherapie: draft } = therapieStore;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await therapieStore.saveDraft();
      if (saved) {
        draft.reset();
        navigate(redirectOnSuccess);
      }
    };

    return (
      <Box component="form" onSubmit={onSubmit} data-testselector="therapie-form">
        <Stack spacing={2}>
          <TextField
            select
            label="Kind"
            value={draft.kindId}
            onChange={(e): void => draft.setKindId(e.target.value)}
            SelectProps={{
              native: true,
              inputProps: { 'data-testselector': 'therapie-form-kindId' },
            }}
            InputLabelProps={{ shrink: true }}
            {...errorProps(draft.errors, 'kindId')}
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
              inputProps: { 'data-testselector': 'therapie-form-auftraggeberId' },
            }}
            InputLabelProps={{ shrink: true }}
            {...errorProps(draft.errors, 'auftraggeberId')}
          >
            <option value="">– bitte wählen –</option>
            {auftraggeberStore.items.map((a) => (
              <option key={a.id} value={a.id}>
                {auftraggeberLabel(a)}
              </option>
            ))}
          </TextField>

          <TextField
            select
            label="Therapieform"
            value={draft.form}
            onChange={(e): void => draft.setForm(e.target.value as TherapieFormValue)}
            SelectProps={{
              native: true,
              inputProps: { 'data-testselector': 'therapie-form-form' },
            }}
            InputLabelProps={{ shrink: true }}
            {...errorProps(draft.errors, 'form')}
          >
            {THERAPIE_FORM_VALUES.map((f) => (
              <option key={f} value={f}>
                {THERAPIE_FORM_LABELS[f]}
              </option>
            ))}
          </TextField>

          {draft.form === 'sonstiges' && (
            <TextField
              label="Kommentar"
              value={draft.kommentar}
              onChange={(e): void => draft.setKommentar(e.target.value)}
              inputProps={{ 'data-testselector': 'therapie-form-kommentar' }}
              {...errorProps(draft.errors, 'kommentar')}
            />
          )}

          <TextField
            label="Bewilligte Behandlungseinheiten"
            type="number"
            value={draft.bewilligteBe === 0 ? '' : draft.bewilligteBe}
            onChange={(e): void => {
              const raw = e.target.value;
              draft.setBewilligteBe(raw === '' ? 0 : Number.parseInt(raw, 10));
            }}
            inputProps={{
              'data-testselector': 'therapie-form-bewilligteBe',
              inputMode: 'numeric',
              min: 1,
            }}
            {...errorProps(draft.errors, 'bewilligteBe')}
          />

          <TextField
            select
            label="Tätigkeit (optional)"
            value={draft.taetigkeit}
            onChange={(e): void =>
              draft.setTaetigkeit(e.target.value === '' ? '' : (e.target.value as TaetigkeitValue))
            }
            inputProps={{ 'data-testselector': 'therapie-form-taetigkeit' }}
            {...errorProps(draft.errors, 'taetigkeit')}
          >
            <MenuItem value="">— keine —</MenuItem>
            {TAETIGKEIT_VALUES.map((value) => (
              <MenuItem key={value} value={value}>
                {TAETIGKEIT_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                checked={draft.gruppentherapie}
                onChange={(e): void => draft.setGruppentherapie(e.target.checked)}
                inputProps={
                  {
                    'data-testselector': 'therapie-form-gruppentherapie',
                  } as InputHTMLAttributes<HTMLInputElement>
                }
              />
            }
            label="Gruppentherapie"
          />

          <Button type="submit" data-testselector="therapie-form-submit">
            Speichern
          </Button>

          {therapieStore.error && (
            <Alert severity="error" role="alert" data-testselector="therapie-form-server-error">
              {therapieStore.error}
            </Alert>
          )}
        </Stack>
      </Box>
    );
  },
);
