import { THERAPIE_FORM_LABELS } from '@behandlungsverwaltung/shared';
import Alert from '@mui/material/Alert';
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
import type { Therapie, TherapieStore } from '../models/TherapieStore';
import { ConfirmDialog } from './ConfirmDialog';

interface TherapieListProps {
  items: Therapie[];
  emptyText?: string;
  store?: TherapieStore;
}

export const TherapieList = observer(
  ({ items, emptyText = 'Noch keine Therapien erfasst.', store }: TherapieListProps) => {
    if (items.length === 0) {
      return (
        <Typography data-testselector="therapie-list-empty" color="text.secondary">
          {emptyText}
        </Typography>
      );
    }
    return (
      <>
        {store?.error && (
          <Alert
            severity="error"
            role="alert"
            sx={{ mb: 2 }}
            data-testselector="therapie-list-error"
          >
            {store.error}
          </Alert>
        )}
        <Table data-testselector="therapie-list">
          <TableHead>
            <TableRow>
              <TableCell>Nachname</TableCell>
              <TableCell>Vorname</TableCell>
              <TableCell>Geleistete BE</TableCell>
              <TableCell>Therapieform</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((t) => (
              <TableRow key={t.id} data-testselector="therapie-row">
                <TableCell>
                  <span data-testselector={`therapie-row-nachname-${t.id}`}>
                    {t.kind?.nachname ?? ''}
                  </span>
                </TableCell>
                <TableCell>
                  <span data-testselector={`therapie-row-vorname-${t.id}`}>
                    {t.kind?.vorname ?? ''}
                  </span>
                </TableCell>
                <TableCell>
                  <span data-testselector={`therapie-row-geleistete-be-${t.id}`}>
                    {t.geleisteteBe ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span data-testselector={`therapie-row-form-${t.id}`}>
                    {THERAPIE_FORM_LABELS[t.form]}
                  </span>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={RouterLink}
                      to={`/therapien/${t.id}`}
                      size="small"
                      variant="outlined"
                      data-testselector={`therapie-row-edit-${t.id}`}
                    >
                      Bearbeiten
                    </Button>
                    {store && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={(): void => store.requestDelete(t.id)}
                        data-testselector={`therapie-row-delete-${t.id}`}
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

        {store && (
          <ConfirmDialog
            open={store.pendingDeleteId !== null}
            title="Therapie wirklich löschen?"
            message="Therapie wirklich löschen?"
            testSelector="therapie-delete-confirm"
            onConfirm={store.confirmDelete}
            onCancel={store.cancelDelete}
          />
        )}
      </>
    );
  },
);
