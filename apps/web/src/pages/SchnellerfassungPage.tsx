import {
  TAETIGKEIT_LABELS,
  TAETIGKEIT_VALUES,
  THERAPIE_FORM_LABELS,
  type TaetigkeitValue,
  type TherapieFormValue,
} from '@behandlungsverwaltung/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { BehandlungsListeInline } from '../components/BehandlungsListeInline';
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
      // Phase C: Vorbelegung der Gruppentherapie-Checkbox basiert auf einer
      // separaten Mini-Query (TherapieStore selbst kennt das Feld in dieser
      // Phase noch nicht — Phase B ergänzt es).
      void behandlungStore.loadTherapieGruppentherapieMap();
    }, [kindStore, auftraggeberStore, therapieStore, behandlungStore]);

    const therapienForKind = draft.kindId
      ? therapieStore.items.filter((t) => t.kindId === draft.kindId)
      : [];

    const onTherapieChange = (id: string): void => {
      const t = therapieStore.items.find((tx) => tx.id === id);
      const defaultGruppentherapie = behandlungStore.therapieGruppentherapieById[id] ?? false;
      draft.setTherapie(id, t?.taetigkeit ?? null, defaultGruppentherapie);
      if (id) void behandlungStore.loadByTherapie(id);
    };

    // Auto-Vorbelegung: bei genau einer Therapie zum gewählten Kind
    // → automatisch wählen, damit der User nicht manuell selektieren muss.
    useEffect(() => {
      if (draft.kindId && !draft.therapieId && therapienForKind.length === 1) {
        onTherapieChange(therapienForKind[0]!.id);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.kindId, therapienForKind.length]);

    // Behandlungen aller Therapien des Kindes vorab laden, damit die Liste
    // schon nach Kind-Auswahl gefüllt ist (auch ohne gewählte Therapie).
    useEffect(() => {
      for (const t of therapienForKind) {
        void behandlungStore.loadByTherapie(t.id);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.kindId, therapienForKind.length]);

    const selectedTherapie = draft.therapieId
      ? therapieStore.items.find((t) => t.id === draft.therapieId)
      : null;
    const behandlungenForView = draft.therapieId
      ? (behandlungStore.byTherapie[draft.therapieId] ?? [])
      : therapienForKind.flatMap((t) => behandlungStore.byTherapie[t.id] ?? []);

    const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const saved = await behandlungStore.saveDraft();
      if (saved) {
        // Therapie-Liste neu laden, damit verfuegbareBe/geleisteteBe
        // im „noch verfügbar"-Indikator nicht stale ist (Bug 7).
        void therapieStore.load();
        // PRD §3.1: Maske bereit für die nächste Behandlung derselben
        // Therapie. Kind/Therapie bleiben, Datum/BE zurückgesetzt,
        // Tätigkeit erneut aus der Therapie vorbelegt.
        const therapie = therapieStore.items.find((t) => t.id === draft.therapieId);
        const defaultGruppentherapie =
          behandlungStore.therapieGruppentherapieById[draft.therapieId] ?? false;
        draft.resetForNextEntry(therapie?.taetigkeit ?? null, defaultGruppentherapie);
        behandlungStore.showSuccess();
      }
    };

    const onFinish = (): void => {
      draft.reset();
      navigate('/');
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
                const formLabel = THERAPIE_FORM_LABELS[t.form as TherapieFormValue] ?? t.form;
                const label = `${formLabel}${ag ? ` · ${auftraggeberLabel(ag)}` : ''}`;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </TextField>

            <Stack direction="row" spacing={2} alignItems="center">
              <Typography component="span">Behandlungseinheiten</Typography>
              <BeStepper
                value={draft.be}
                onIncrement={draft.incrementBe}
                onDecrement={draft.decrementBe}
                testPrefix="schnellerfassung-be"
              />
              {selectedTherapie && (
                <Typography
                  component="span"
                  data-testselector="schnellerfassung-noch-verfuegbar"
                  sx={{ ml: 'auto' }}
                >
                  noch verfügbar: {selectedTherapie.verfuegbareBe ?? 0} BE
                </Typography>
              )}
            </Stack>

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

            {draft.taetigkeit === 'sonstiges' && (
              <TextField
                label="Beschreibung (max. 35 Zeichen)"
                value={draft.sonstigesText}
                onChange={(e): void => draft.setSonstigesText(e.target.value)}
                inputProps={{
                  'data-testselector': 'behandlung-form-sonstiges-text',
                  maxLength: 35,
                }}
                error={Boolean(draft.errors.sonstigesText)}
                helperText={
                  draft.errors.sonstigesText ? (
                    <span role="alert" data-testselector="behandlung-form-sonstiges-text-error">
                      {draft.errors.sonstigesText}
                    </span>
                  ) : null
                }
              />
            )}

            <FormControlLabel
              label="Gruppentherapie"
              control={
                <Checkbox
                  checked={draft.gruppentherapie}
                  onChange={(e): void => draft.setGruppentherapie(e.target.checked)}
                  inputProps={
                    {
                      'data-testselector': 'behandlung-form-gruppentherapie',
                      'aria-label': 'Gruppentherapie',
                    } as InputHTMLAttributes<HTMLInputElement>
                  }
                />
              }
            />

            <Stack direction="row" spacing={1}>
              <Button type="submit" data-testselector="schnellerfassung-submit">
                Speichern
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={onFinish}
                data-testselector="schnellerfassung-finish"
              >
                Fertig
              </Button>
            </Stack>

            {behandlungStore.error && (
              <Alert
                severity="error"
                role="alert"
                data-testselector="schnellerfassung-server-error"
                onClose={behandlungStore.dismissError}
              >
                {behandlungStore.error}
              </Alert>
            )}
          </Stack>
        </Box>

        {draft.kindId && behandlungenForView.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <BehandlungsListeInline
              behandlungen={behandlungenForView}
              verfuegbareBe={draft.therapieId ? (selectedTherapie?.verfuegbareBe ?? 0) : null}
              onDelete={(id, therapieId): void => {
                void behandlungStore.delete(id, therapieId);
              }}
            />
          </Box>
        )}

        <Snackbar
          open={behandlungStore.successOpen}
          autoHideDuration={2500}
          onClose={behandlungStore.dismissSuccess}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          message="Behandlung gespeichert"
          data-testselector="schnellerfassung-success"
        />
      </Box>
    );
  },
);
