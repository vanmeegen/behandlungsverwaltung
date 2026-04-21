import { TAETIGKEIT_LABELS, THERAPIE_FORM_LABELS } from '@behandlungsverwaltung/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
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
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);

    async function confirmDelete(): Promise<void> {
      if (!pendingDelete || !store) return;
      await store.remove(pendingDelete);
      setPendingDelete(null);
    }

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
        <List data-testselector="therapie-list">
          {items.map((t) => (
            <ListItem
              key={t.id}
              data-testselector="therapie-row"
              secondaryAction={
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
                      onClick={(): void => setPendingDelete(t.id)}
                      data-testselector={`therapie-row-delete-${t.id}`}
                    >
                      Löschen
                    </Button>
                  )}
                </Stack>
              }
            >
              <ListItemText
                primary={
                  <Box component="span">
                    <span data-testselector={`therapie-row-form-${t.id}`}>
                      {THERAPIE_FORM_LABELS[t.form]}
                    </span>
                    {' · '}
                    <span data-testselector={`therapie-row-be-${t.id}`}>{t.bewilligteBe} BE</span>
                    {t.taetigkeit && (
                      <>
                        {' · '}
                        <span data-testselector={`therapie-row-taetigkeit-${t.id}`}>
                          {TAETIGKEIT_LABELS[t.taetigkeit]}
                        </span>
                      </>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        <ConfirmDialog
          open={pendingDelete !== null}
          title="Therapie wirklich löschen?"
          message="Therapie wirklich löschen?"
          testSelector="therapie-delete-confirm"
          onConfirm={confirmDelete}
          onCancel={(): void => setPendingDelete(null)}
        />
      </>
    );
  },
);
