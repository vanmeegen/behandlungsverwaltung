import { TAETIGKEIT_LABELS } from '@behandlungsverwaltung/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { Link as RouterLink } from 'react-router-dom';
import type { Behandlung } from '../models/BehandlungStore';
import type { TaetigkeitValue } from '@behandlungsverwaltung/shared';

interface BehandlungsListeInlineProps {
  behandlungen: Behandlung[];
  verfuegbareBe: number;
  onDelete?: (id: string) => void;
}

function formatDatum(isoOrDate: string): string {
  const date = new Date(isoOrDate);
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}.${m}.${y}`;
}

export const BehandlungsListeInline = observer(
  ({ behandlungen, verfuegbareBe, onDelete }: BehandlungsListeInlineProps) => {
    const sorted = [...behandlungen].sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
    );

    return (
      <Box data-testselector="schnellerfassung-behandlungsliste">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Erfasste Behandlungen</Typography>
          <Typography
            variant="body2"
            data-testselector="schnellerfassung-behandlungsliste-noch-verfuegbar"
          >
            noch verfügbar: {verfuegbareBe} BE
          </Typography>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Datum</TableCell>
              <TableCell>Tätigkeit</TableCell>
              <TableCell>BE</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((b) => (
              <TableRow
                key={b.id}
                data-testselector={`schnellerfassung-behandlungsliste-zeile-${b.id}`}
              >
                <TableCell>{formatDatum(b.datum)}</TableCell>
                <TableCell>
                  {b.taetigkeit
                    ? (TAETIGKEIT_LABELS[b.taetigkeit as TaetigkeitValue] ?? b.taetigkeit)
                    : '—'}
                </TableCell>
                <TableCell>{b.be}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      to={`/behandlungen/${b.id}/bearbeiten`}
                    >
                      Bearbeiten
                    </Button>
                    {onDelete && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={(): void => onDelete(b.id)}
                      >
                        Löschen
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  },
);
