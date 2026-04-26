import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  ErziehungsberechtigterStore,
  ErziehungsberechtigterFormInput,
} from '../models/ErziehungsberechtigterStore';

interface ErziehungsberechtigterFormPageProps {
  ezbStore: ErziehungsberechtigterStore;
}

export const ErziehungsberechtigterFormPage = observer(
  ({ ezbStore }: ErziehungsberechtigterFormPageProps) => {
    const { id: kindId, slot: slotParam } = useParams<{ id: string; slot: string }>();
    const slot = Number(slotParam) as 1 | 2;
    const navigate = useNavigate();

    const existing = kindId ? ezbStore.getSlot(kindId, slot) : null;

    const [vorname, setVorname] = useState(existing?.vorname ?? '');
    const [nachname, setNachname] = useState(existing?.nachname ?? '');
    const [strasse, setStrasse] = useState(existing?.strasse ?? '');
    const [hausnummer, setHausnummer] = useState(existing?.hausnummer ?? '');
    const [plz, setPlz] = useState(existing?.plz ?? '');
    const [stadt, setStadt] = useState(existing?.stadt ?? '');
    const [email1, setEmail1] = useState(existing?.email1 ?? '');
    const [telefon1, setTelefon1] = useState(existing?.telefon1 ?? '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (existing) {
        setVorname(existing.vorname);
        setNachname(existing.nachname);
        setStrasse(existing.strasse ?? '');
        setHausnummer(existing.hausnummer ?? '');
        setPlz(existing.plz ?? '');
        setStadt(existing.stadt ?? '');
        setEmail1(existing.email1 ?? '');
        setTelefon1(existing.telefon1 ?? '');
      }
    }, [existing]);

    const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (!kindId) return;
      const input: ErziehungsberechtigterFormInput = {
        kindId,
        slot,
        vorname,
        nachname,
        strasse: strasse || null,
        hausnummer: hausnummer || null,
        plz: plz || null,
        stadt: stadt || null,
        email1: email1 || null,
        telefon1: telefon1 || null,
      };
      const result = await ezbStore.save(input);
      if (result) {
        navigate(`/kinder/${kindId}`);
      } else {
        setError(ezbStore.error);
      }
    };

    const makeHandler =
      (setter: (v: string) => void) =>
      (e: ChangeEvent<HTMLInputElement>): void =>
        setter(e.target.value);

    return (
      <Box data-testselector="ezb-form-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Erziehungsberechtigte {slot}
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Vorname"
              value={vorname}
              onChange={makeHandler(setVorname)}
              inputProps={{ 'data-testselector': 'ezb-form-vorname' }}
              required
            />
            <TextField
              label="Nachname"
              value={nachname}
              onChange={makeHandler(setNachname)}
              inputProps={{ 'data-testselector': 'ezb-form-nachname' }}
              required
            />
            <TextField
              label="Straße"
              value={strasse}
              onChange={makeHandler(setStrasse)}
              inputProps={{ 'data-testselector': 'ezb-form-strasse' }}
            />
            <TextField
              label="Hausnummer"
              value={hausnummer}
              onChange={makeHandler(setHausnummer)}
              inputProps={{ 'data-testselector': 'ezb-form-hausnummer' }}
            />
            <TextField
              label="PLZ"
              value={plz}
              onChange={makeHandler(setPlz)}
              inputProps={{ 'data-testselector': 'ezb-form-plz' }}
            />
            <TextField
              label="Stadt"
              value={stadt}
              onChange={makeHandler(setStadt)}
              inputProps={{ 'data-testselector': 'ezb-form-stadt' }}
            />
            <TextField
              label="E-Mail"
              type="email"
              value={email1}
              onChange={makeHandler(setEmail1)}
              inputProps={{ 'data-testselector': 'ezb-form-email1' }}
            />
            <TextField
              label="Telefon"
              value={telefon1}
              onChange={makeHandler(setTelefon1)}
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
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Box>
      </Box>
    );
  },
);
