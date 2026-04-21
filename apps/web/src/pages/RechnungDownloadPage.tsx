import { formatEuro } from '@behandlungsverwaltung/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { Rechnung, RechnungStore } from '../models/RechnungStore';

interface RechnungDownloadPageProps {
  rechnungStore: RechnungStore;
  auftraggeberStore: AuftraggeberStore;
}

function todayMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const RechnungDownloadPage = observer(
  ({ rechnungStore, auftraggeberStore }: RechnungDownloadPageProps) => {
    const defaults = useMemo(() => todayMonth(), []);
    const [auftraggeberId, setAuftraggeberId] = useState('');
    const [year, setYear] = useState<number>(defaults.year);
    const [month, setMonth] = useState<number>(defaults.month);
    const [downloaded, setDownloaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      void auftraggeberStore.load();
    }, [auftraggeberStore]);

    useEffect(() => {
      if (!auftraggeberId) return;
      void rechnungStore.load({
        auftraggeberId,
        year,
        month,
      });
    }, [auftraggeberStore, rechnungStore, auftraggeberId, year, month]);

    const rows: Rechnung[] = rechnungStore.items.filter(
      (r) => r.auftraggeberId === auftraggeberId && r.jahr === year && r.monat === month,
    );

    const monthValue = `${year}-${String(month).padStart(2, '0')}`;

    function onMonthChange(e: ChangeEvent<HTMLInputElement>): void {
      const raw = e.target.value;
      if (!/^\d{4}-\d{2}$/.test(raw)) return;
      const [y, m] = raw.split('-') as [string, string];
      setYear(Number.parseInt(y, 10));
      setMonth(Number.parseInt(m, 10));
      setDownloaded(false);
    }

    function onAuftraggeberChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
      setAuftraggeberId(e.target.value);
      setDownloaded(false);
    }

    async function onDownload(): Promise<void> {
      if (!auftraggeberId || rows.length === 0) return;
      setError(null);
      const bundleUrl = `/bills/bundle?auftraggeberId=${encodeURIComponent(
        auftraggeberId,
      )}&jahr=${year}&monat=${month}`;
      try {
        const res = await fetch(bundleUrl);
        if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
        const blob = await res.blob();
        const disposition = res.headers.get('content-disposition') ?? '';
        const match = /filename="([^"]+)"/.exec(disposition);
        const filename = match?.[1] ?? `RE-${year}-${String(month).padStart(2, '0')}.zip`;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);

        await rechnungStore.markDownloaded(rows.map((r) => r.id));
        setDownloaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    return (
      <Box data-testselector="rechnung-download-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Rechnungen pro Auftraggeber herunterladen
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            label="Auftraggeber"
            value={auftraggeberId}
            onChange={onAuftraggeberChange}
            SelectProps={{
              native: true,
              inputProps: { 'data-testselector': 'rechnung-download-auftraggeberId' },
            }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">– bitte wählen –</option>
            {auftraggeberStore.items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.typ === 'firma' ? a.firmenname : `${a.nachname ?? ''}, ${a.vorname ?? ''}`}
              </option>
            ))}
          </TextField>

          <TextField
            label="Monat"
            type="month"
            value={monthValue}
            onChange={onMonthChange}
            inputProps={{ 'data-testselector': 'rechnung-download-monat' }}
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="contained"
            onClick={onDownload}
            disabled={!auftraggeberId || rows.length === 0}
            data-testselector="rechnung-download-trigger"
          >
            Rechnungen herunterladen
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-testselector="rechnung-download-error">
            {error}
          </Alert>
        )}

        {downloaded && rows.length > 0 && (
          <Alert severity="success" sx={{ mb: 2 }} data-testselector="rechnung-download-success">
            {`${rows.length} Rechnung${rows.length === 1 ? '' : 'en'} heruntergeladen und als versendet markiert.`}
          </Alert>
        )}

        {auftraggeberId && rows.length === 0 ? (
          <Typography data-testselector="rechnung-download-empty" color="text.secondary">
            Keine Rechnungen für diesen Monat.
          </Typography>
        ) : null}

        {rows.length > 0 && (
          <TableContainer>
            <Table data-testselector="rechnung-download-table">
              <TableHead>
                <TableRow>
                  <TableCell>Nummer</TableCell>
                  <TableCell>Datei</TableCell>
                  <TableCell align="right">Gesamtsumme</TableCell>
                  <TableCell>heruntergeladen am</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-testselector={`rechnung-download-row-${r.nummer}`}>
                    <TableCell>{r.nummer}</TableCell>
                    <TableCell>{r.dateiname}</TableCell>
                    <TableCell align="right">{formatEuro(r.gesamtCents)}</TableCell>
                    <TableCell>
                      {r.downloadedAt ? new Date(r.downloadedAt).toLocaleDateString('de-DE') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  },
);
