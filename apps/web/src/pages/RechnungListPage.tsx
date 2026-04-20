import { formatEuro } from '@behandlungsverwaltung/shared';
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
import { useEffect, type ChangeEvent } from 'react';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { KindStore } from '../models/KindStore';
import type { Rechnung, RechnungStore } from '../models/RechnungStore';

interface RechnungListPageProps {
  rechnungStore: RechnungStore;
  kindStore: KindStore;
  auftraggeberStore: AuftraggeberStore;
}

export const RechnungListPage = observer(
  ({ rechnungStore, kindStore, auftraggeberStore }: RechnungListPageProps) => {
    const { filter } = rechnungStore;

    useEffect(() => {
      void kindStore.load();
      void auftraggeberStore.load();
      void rechnungStore.load(filter.toInput());
    }, [rechnungStore, kindStore, auftraggeberStore, filter]);

    function onKindChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
      filter.setKindId(e.target.value);
      void rechnungStore.load(filter.toInput());
    }
    function onAgChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
      filter.setAuftraggeberId(e.target.value);
      void rechnungStore.load(filter.toInput());
    }
    function onMonthChange(e: ChangeEvent<HTMLInputElement>): void {
      const raw = e.target.value;
      if (raw === '') {
        filter.clearMonat();
      } else if (/^\d{4}-\d{2}$/.test(raw)) {
        const [y, m] = raw.split('-') as [string, string];
        filter.setMonat(Number.parseInt(y, 10), Number.parseInt(m, 10));
      }
      void rechnungStore.load(filter.toInput());
    }

    const monthValue =
      filter.year !== null && filter.month !== null
        ? `${filter.year}-${String(filter.month).padStart(2, '0')}`
        : '';

    function kindLabel(r: Rechnung): string {
      const k = kindStore.items.find((x) => x.id === r.kindId);
      return k ? `${k.nachname}, ${k.vorname}` : r.kindId;
    }
    function agLabel(r: Rechnung): string {
      const a = auftraggeberStore.items.find((x) => x.id === r.auftraggeberId);
      if (!a) return r.auftraggeberId;
      if (a.typ === 'firma') return a.firmenname ?? '';
      return `${a.nachname ?? ''}, ${a.vorname ?? ''}`;
    }

    return (
      <Box data-testselector="rechnung-list-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Rechnungsübersicht
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2 }}
          data-testselector="rechnung-list-filter"
        >
          <TextField
            select
            label="Kind"
            value={filter.kindId}
            onChange={onKindChange}
            SelectProps={{
              native: true,
              inputProps: { 'data-testselector': 'rechnung-list-filter-kindId' },
            }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">– alle –</option>
            {kindStore.items.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nachname}, {k.vorname}
              </option>
            ))}
          </TextField>

          <TextField
            select
            label="Auftraggeber"
            value={filter.auftraggeberId}
            onChange={onAgChange}
            SelectProps={{
              native: true,
              inputProps: { 'data-testselector': 'rechnung-list-filter-auftraggeberId' },
            }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">– alle –</option>
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
            inputProps={{ 'data-testselector': 'rechnung-list-filter-monat' }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        {rechnungStore.items.length === 0 ? (
          <Typography data-testselector="rechnung-list-empty" color="text.secondary">
            Keine Rechnungen vorhanden.
          </Typography>
        ) : (
          <TableContainer>
            <Table data-testselector="rechnung-list-table">
              <TableHead>
                <TableRow>
                  <TableCell>Nummer</TableCell>
                  <TableCell>Monat</TableCell>
                  <TableCell>Kind</TableCell>
                  <TableCell>Auftraggeber</TableCell>
                  <TableCell align="right">Gesamtsumme</TableCell>
                  <TableCell>PDF</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rechnungStore.items.map((r) => (
                  <TableRow key={r.id} data-testselector={`rechnung-row-${r.nummer}`}>
                    <TableCell>{r.nummer}</TableCell>
                    <TableCell>{`${String(r.monat).padStart(2, '0')}/${r.jahr}`}</TableCell>
                    <TableCell>{kindLabel(r)}</TableCell>
                    <TableCell>{agLabel(r)}</TableCell>
                    <TableCell
                      align="right"
                      data-testselector={`rechnung-row-${r.nummer}-gesamtsumme`}
                    >
                      {formatEuro(r.gesamtCents)}
                    </TableCell>
                    <TableCell>
                      <Button
                        component="a"
                        href={`/bills/${r.dateiname}`}
                        download={r.dateiname}
                        size="small"
                        variant="outlined"
                        data-testselector={`rechnung-row-${r.nummer}-download`}
                      >
                        PDF
                      </Button>
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
