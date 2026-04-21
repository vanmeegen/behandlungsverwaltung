import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { KindStore } from '../models/KindStore';
import { ConfirmDialog } from './ConfirmDialog';

interface KindListProps {
  store: KindStore;
}

export const KindList = observer(({ store }: KindListProps) => {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    await store.remove(pendingDelete);
    setPendingDelete(null);
  }

  return (
    <Box data-testselector="kind-list">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          Kinder
        </Typography>
        <Button component={RouterLink} to="/kinder/new" data-testselector="kind-list-new">
          Neu
        </Button>
      </Stack>
      {store.error && (
        <Alert severity="error" role="alert" data-testselector="kind-list-error" sx={{ mb: 2 }}>
          {store.error}
        </Alert>
      )}
      {store.items.length === 0 ? (
        <Typography data-testselector="kind-list-empty" color="text.secondary">
          Noch keine Kinder erfasst.
        </Typography>
      ) : (
        <List>
          {store.items.map((kind) => (
            <ListItem
              key={kind.id}
              data-testselector="kind-row"
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button
                    component={RouterLink}
                    to={`/kinder/${kind.id}`}
                    size="small"
                    variant="outlined"
                    data-testselector={`kind-row-edit-${kind.id}`}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={(): void => setPendingDelete(kind.id)}
                    data-testselector={`kind-row-delete-${kind.id}`}
                  >
                    Löschen
                  </Button>
                </Stack>
              }
            >
              <ListItemButton
                component={RouterLink}
                to={`/kinder/${kind.id}/detail`}
                data-testselector={`kind-row-detail-${kind.id}`}
              >
                <ListItemText
                  primary={
                    <>
                      <span data-testselector={`kind-row-nachname-${kind.id}`}>
                        {kind.nachname}
                      </span>
                      {', '}
                      <span data-testselector={`kind-row-vorname-${kind.id}`}>{kind.vorname}</span>
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Kind wirklich löschen?"
        message="Kind wirklich löschen?"
        testSelector="kind-delete-confirm"
        onConfirm={confirmDelete}
        onCancel={(): void => setPendingDelete(null)}
      />
    </Box>
  );
});
