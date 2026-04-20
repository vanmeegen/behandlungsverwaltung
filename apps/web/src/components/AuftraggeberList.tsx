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
                <Button
                  component={RouterLink}
                  to={`/auftraggeber/${ag.id}`}
                  size="small"
                  variant="outlined"
                  data-testselector={`auftraggeber-row-edit-${ag.id}`}
                >
                  Bearbeiten
                </Button>
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
    </Box>
  );
});
