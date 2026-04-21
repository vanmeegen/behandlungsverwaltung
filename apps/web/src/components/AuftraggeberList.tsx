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
import { Link as RouterLink } from 'react-router-dom';
import type { Auftraggeber, AuftraggeberStore } from '../models/AuftraggeberStore';
import { ConfirmDialog } from './ConfirmDialog';

interface AuftraggeberListProps {
  store: AuftraggeberStore;
}

function displayName(ag: Auftraggeber): JSX.Element {
  if (ag.typ === 'firma') {
    return <span data-testselector={`auftraggeber-row-firmenname-${ag.id}`}>{ag.firmenname}</span>;
  }
  return (
    <>
      <span data-testselector={`auftraggeber-row-nachname-${ag.id}`}>{ag.nachname}</span>
      {', '}
      <span data-testselector={`auftraggeber-row-vorname-${ag.id}`}>{ag.vorname}</span>
    </>
  );
}

export const AuftraggeberList = observer(({ store }: AuftraggeberListProps) => {
  return (
    <Box data-testselector="auftraggeber-list">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          Auftraggeber
        </Typography>
        <Button
          component={RouterLink}
          to="/auftraggeber/new"
          data-testselector="auftraggeber-list-new"
        >
          Neu
        </Button>
      </Stack>
      {store.error && (
        <Alert
          severity="error"
          role="alert"
          sx={{ mb: 2 }}
          data-testselector="auftraggeber-list-error"
        >
          {store.error}
        </Alert>
      )}
      {store.items.length === 0 ? (
        <Typography data-testselector="auftraggeber-list-empty" color="text.secondary">
          Noch keine Auftraggeber erfasst.
        </Typography>
      ) : (
        <List>
          {store.items.map((ag) => (
            <ListItem
              key={ag.id}
              data-testselector="auftraggeber-row"
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button
                    component={RouterLink}
                    to={`/auftraggeber/${ag.id}`}
                    size="small"
                    variant="outlined"
                    data-testselector={`auftraggeber-row-edit-${ag.id}`}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={(): void => store.requestDelete(ag.id)}
                    data-testselector={`auftraggeber-row-delete-${ag.id}`}
                  >
                    Löschen
                  </Button>
                </Stack>
              }
            >
              <ListItemButton
                component={RouterLink}
                to={`/auftraggeber/${ag.id}/detail`}
                data-testselector={`auftraggeber-row-detail-${ag.id}`}
              >
                <ListItemText primary={displayName(ag)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <ConfirmDialog
        open={store.pendingDeleteId !== null}
        title="Auftraggeber wirklich löschen?"
        message="Auftraggeber wirklich löschen?"
        testSelector="auftraggeber-delete-confirm"
        onConfirm={store.confirmDelete}
        onCancel={store.cancelDelete}
      />
    </Box>
  );
});
