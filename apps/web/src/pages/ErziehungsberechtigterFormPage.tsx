import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ErziehungsberechtigterStore } from '../models/ErziehungsberechtigterStore';

interface ErziehungsberechtigterFormPageProps {
  ezbStore: ErziehungsberechtigterStore;
}

export const ErziehungsberechtigterFormPage = observer(
  ({ ezbStore }: ErziehungsberechtigterFormPageProps) => {
    const { id: kindId, slot: slotParam } = useParams<{ id: string; slot: string }>();
    const slot = Number(slotParam) as 1 | 2;
    const navigate = useNavigate();
    const draft = ezbStore.draftEzb;

    useEffect(() => {
      if (!kindId) return;
      ezbStore.initDraftFor(kindId, slot);
      return (): void => {
        ezbStore.resetDraft();
      };
    }, [kindId, slot, ezbStore, ezbStore.byKind]);

    const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (!kindId) return;
      const result = await ezbStore.saveDraft();
      if (result) {
        navigate(`/kinder/${kindId}`);
      }
    };

    return (
      <Box data-testselector="ezb-form-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Erziehungsberechtigte {slot}
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Vorname"
              value={draft.vorname}
              onChange={(e): void => draft.setVorname(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-vorname' }}
              required
            />
            <TextField
              label="Nachname"
              value={draft.nachname}
              onChange={(e): void => draft.setNachname(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-nachname' }}
              required
            />
            <TextField
              label="Straße"
              value={draft.strasse}
              onChange={(e): void => draft.setStrasse(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-strasse' }}
            />
            <TextField
              label="Hausnummer"
              value={draft.hausnummer}
              onChange={(e): void => draft.setHausnummer(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-hausnummer' }}
            />
            <TextField
              label="PLZ"
              value={draft.plz}
              onChange={(e): void => draft.setPlz(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-plz' }}
            />
            <TextField
              label="Stadt"
              value={draft.stadt}
              onChange={(e): void => draft.setStadt(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-stadt' }}
            />
            <TextField
              label="E-Mail"
              type="email"
              value={draft.email1}
              onChange={(e): void => draft.setEmail1(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-email1' }}
            />
            <TextField
              label="Telefon"
              value={draft.telefon1}
              onChange={(e): void => draft.setTelefon1(e.target.value)}
              inputProps={{ 'data-testselector': 'ezb-form-telefon1' }}
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" data-testselector="ezb-form-submit">
                Speichern
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={(): void => {
                  navigate(-1);
                }}
                data-testselector="ezb-form-abbrechen"
              >
                Abbrechen
              </Button>
            </Stack>
            {ezbStore.error && <Alert severity="error">{ezbStore.error}</Alert>}
          </Stack>
        </Box>
      </Box>
    );
  },
);
