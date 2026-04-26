import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuftraggeberFieldErrors, AuftraggeberStore } from '../models/AuftraggeberStore';

interface AuftraggeberFormProps {
  store: AuftraggeberStore;
  redirectOnSuccess?: string;
}

function errorProps(
  errors: AuftraggeberFieldErrors,
  field: keyof AuftraggeberFieldErrors,
): {
  error: boolean;
  helperText: JSX.Element | null;
} {
  const message = errors[field];
  return {
    error: Boolean(message),
    helperText: message ? (
      <span role="alert" data-testselector={`auftraggeber-form-${field}-error`}>
        {message}
      </span>
    ) : null,
  };
}

export const AuftraggeberForm = observer(
  ({ store, redirectOnSuccess = '/auftraggeber' }: AuftraggeberFormProps) => {
    const navigate = useNavigate();
    const { draftAuftraggeber: draft } = store;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await store.saveDraft();
      if (saved) {
        draft.reset();
        navigate(redirectOnSuccess);
      }
    };

    const makeHandler =
      (setter: (value: string) => void) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        setter(event.target.value);
      };

    return (
      <Box component="form" onSubmit={onSubmit} data-testselector="auftraggeber-form">
        <Stack spacing={2}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Typ</FormLabel>
            <RadioGroup
              row
              value={draft.typ}
              onChange={(event): void => draft.setTyp(event.target.value as 'firma' | 'person')}
            >
              <FormControlLabel
                value="firma"
                label="Firma"
                control={
                  <Radio
                    inputProps={
                      {
                        'data-testselector': 'auftraggeber-form-typ-firma',
                      } as React.InputHTMLAttributes<HTMLInputElement>
                    }
                  />
                }
              />
              <FormControlLabel
                value="person"
                label="Person"
                control={
                  <Radio
                    inputProps={
                      {
                        'data-testselector': 'auftraggeber-form-typ-person',
                      } as React.InputHTMLAttributes<HTMLInputElement>
                    }
                  />
                }
              />
            </RadioGroup>
          </FormControl>

          {draft.typ === 'firma' && (
            <>
              <TextField
                label="Firmenname"
                value={draft.firmenname}
                onChange={makeHandler(draft.setFirmenname)}
                inputProps={{ 'data-testselector': 'auftraggeber-form-firmenname' }}
                {...errorProps(draft.errors, 'firmenname')}
              />
              <TextField
                label="Abteilung"
                value={draft.abteilung}
                onChange={makeHandler(draft.setAbteilung)}
                inputProps={{ 'data-testselector': 'auftraggeber-form-abteilung' }}
              />
              <Typography variant="subtitle1" sx={{ mt: 1 }}>
                Gruppentherapie-Stundensätze
              </Typography>
              {([1, 2, 3, 4] as const).map((n) => (
                <Box key={n} sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label={`Gruppe ${n} Anteil (%)`}
                    type="number"
                    value={draft[`gruppe${n}Prozent` as `gruppe${typeof n}Prozent`]}
                    onChange={makeHandler(
                      draft[`setGruppe${n}Prozent` as `setGruppe${typeof n}Prozent`],
                    )}
                    inputProps={{
                      'data-testselector': `auftraggeber-form-gruppe${n}-prozent`,
                      min: 0,
                      max: 100,
                    }}
                  />
                  <TextField
                    label={`Gruppe ${n} Stundensatz (€)`}
                    value={draft[`gruppe${n}Stundensatz` as `gruppe${typeof n}Stundensatz`]}
                    onChange={makeHandler(
                      draft[`setGruppe${n}Stundensatz` as `setGruppe${typeof n}Stundensatz`],
                    )}
                    inputProps={{
                      'data-testselector': `auftraggeber-form-gruppe${n}-stundensatz`,
                      inputMode: 'decimal',
                    }}
                  />
                </Box>
              ))}
            </>
          )}

          {draft.typ === 'person' && (
            <>
              <TextField
                label="Vorname"
                value={draft.vorname}
                onChange={makeHandler(draft.setVorname)}
                inputProps={{ 'data-testselector': 'auftraggeber-form-vorname' }}
                {...errorProps(draft.errors, 'vorname')}
              />
              <TextField
                label="Nachname"
                value={draft.nachname}
                onChange={makeHandler(draft.setNachname)}
                inputProps={{ 'data-testselector': 'auftraggeber-form-nachname' }}
                {...errorProps(draft.errors, 'nachname')}
              />
            </>
          )}

          <TextField
            label="Straße"
            value={draft.strasse}
            onChange={makeHandler(draft.setStrasse)}
            inputProps={{ 'data-testselector': 'auftraggeber-form-strasse' }}
            {...errorProps(draft.errors, 'strasse')}
          />

          <TextField
            label="Hausnummer"
            value={draft.hausnummer}
            onChange={makeHandler(draft.setHausnummer)}
            inputProps={{ 'data-testselector': 'auftraggeber-form-hausnummer' }}
            {...errorProps(draft.errors, 'hausnummer')}
          />

          <TextField
            label="PLZ"
            value={draft.plz}
            onChange={makeHandler(draft.setPlz)}
            inputProps={{ 'data-testselector': 'auftraggeber-form-plz' }}
            {...errorProps(draft.errors, 'plz')}
          />

          <TextField
            label="Stadt"
            value={draft.stadt}
            onChange={makeHandler(draft.setStadt)}
            inputProps={{ 'data-testselector': 'auftraggeber-form-stadt' }}
            {...errorProps(draft.errors, 'stadt')}
          />

          <TextField
            label="Stundensatz (€)"
            value={draft.stundensatz}
            onChange={makeHandler(draft.setStundensatz)}
            inputProps={{
              'data-testselector': 'auftraggeber-form-stundensatz',
              inputMode: 'decimal',
            }}
            {...errorProps(draft.errors, 'stundensatzCents')}
          />

          <TextField
            label="Rechnungskopf-Text"
            value={draft.rechnungskopfText}
            onChange={makeHandler(draft.setRechnungskopfText)}
            multiline
            minRows={3}
            inputProps={{ 'data-testselector': 'auftraggeber-form-rechnungskopf' }}
            {...errorProps(draft.errors, 'rechnungskopfText')}
          />

          <Button type="submit" data-testselector="auftraggeber-form-submit">
            Speichern
          </Button>

          {store.error && (
            <Alert severity="error" role="alert" data-testselector="auftraggeber-form-server-error">
              {store.error}
            </Alert>
          )}
        </Stack>
      </Box>
    );
  },
);
