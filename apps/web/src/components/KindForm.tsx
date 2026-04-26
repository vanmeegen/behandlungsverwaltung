import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import type { ChangeEvent, FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import type { KindFieldErrors, KindStore } from '../models/KindStore';
import type { ErziehungsberechtigterStore } from '../models/ErziehungsberechtigterStore';

interface KindFormProps {
  store: KindStore;
  ezbStore?: ErziehungsberechtigterStore | undefined;
  redirectOnSuccess?: string;
}

function errorProps(
  errors: KindFieldErrors,
  field: keyof KindFieldErrors,
): {
  error: boolean;
  helperText: JSX.Element | null;
} {
  const message = errors[field];
  return {
    error: Boolean(message),
    helperText: message ? (
      <span role="alert" data-testselector={`kind-form-${field}-error`}>
        {message}
      </span>
    ) : null,
  };
}

export const KindForm = observer(
  ({ store, ezbStore, redirectOnSuccess = '/kinder' }: KindFormProps) => {
    const navigate = useNavigate();
    const { draftKind } = store;

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await store.saveDraft();
      if (saved) {
        draftKind.reset();
        navigate(redirectOnSuccess);
      }
    };

    const makeHandler =
      (setter: (value: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        setter(event.target.value);
      };

    return (
      <Box component="form" onSubmit={onSubmit} data-testselector="kind-form">
        <Stack spacing={2}>
          <TextField
            label="Vorname"
            value={draftKind.vorname}
            onChange={makeHandler(draftKind.setVorname)}
            inputProps={{ 'data-testselector': 'kind-form-vorname' }}
            {...errorProps(draftKind.errors, 'vorname')}
          />

          <TextField
            label="Nachname"
            value={draftKind.nachname}
            onChange={makeHandler(draftKind.setNachname)}
            inputProps={{ 'data-testselector': 'kind-form-nachname' }}
            {...errorProps(draftKind.errors, 'nachname')}
          />

          <TextField
            label="Geburtsdatum"
            type="date"
            value={draftKind.geburtsdatum}
            onChange={makeHandler(draftKind.setGeburtsdatum)}
            inputProps={{ 'data-testselector': 'kind-form-geburtsdatum' }}
            InputLabelProps={{ shrink: true }}
            {...errorProps(draftKind.errors, 'geburtsdatum')}
          />

          <TextField
            label="Straße"
            value={draftKind.strasse}
            onChange={makeHandler(draftKind.setStrasse)}
            inputProps={{ 'data-testselector': 'kind-form-strasse' }}
            {...errorProps(draftKind.errors, 'strasse')}
          />

          <TextField
            label="Hausnummer"
            value={draftKind.hausnummer}
            onChange={makeHandler(draftKind.setHausnummer)}
            inputProps={{ 'data-testselector': 'kind-form-hausnummer' }}
            {...errorProps(draftKind.errors, 'hausnummer')}
          />

          <TextField
            label="PLZ"
            value={draftKind.plz}
            onChange={makeHandler(draftKind.setPlz)}
            inputProps={{ 'data-testselector': 'kind-form-plz' }}
            {...errorProps(draftKind.errors, 'plz')}
          />

          <TextField
            label="Stadt"
            value={draftKind.stadt}
            onChange={makeHandler(draftKind.setStadt)}
            inputProps={{ 'data-testselector': 'kind-form-stadt' }}
            {...errorProps(draftKind.errors, 'stadt')}
          />

          <TextField
            label="Aktenzeichen"
            value={draftKind.aktenzeichen}
            onChange={makeHandler(draftKind.setAktenzeichen)}
            inputProps={{ 'data-testselector': 'kind-form-aktenzeichen' }}
            {...errorProps(draftKind.errors, 'aktenzeichen')}
          />

          <Button type="submit" data-testselector="kind-form-submit">
            Speichern
          </Button>

          {store.error && (
            <Alert severity="error" role="alert" data-testselector="kind-form-server-error">
              {store.error}
            </Alert>
          )}

          {ezbStore && draftKind.editingId && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1">Erziehungsberechtigte</Typography>
              {([1, 2] as const).map((slot) => {
                const ezb = ezbStore.getSlot(draftKind.editingId!, slot);
                return (
                  <Box
                    key={slot}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    data-testselector={`kind-form-ezb-slot-${slot}`}
                  >
                    <Typography>
                      Erziehungsberechtigte {slot}:{' '}
                      {ezb ? `${ezb.nachname}, ${ezb.vorname}` : '— leer —'}
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={`/kinder/${draftKind.editingId}/erziehungsberechtigte/${slot}`}
                      size="small"
                      variant="outlined"
                      data-testselector={`kind-form-ezb-slot-${slot}-bearbeiten`}
                    >
                      Bearbeiten
                    </Button>
                  </Box>
                );
              })}
            </>
          )}
        </Stack>
      </Box>
    );
  },
);
