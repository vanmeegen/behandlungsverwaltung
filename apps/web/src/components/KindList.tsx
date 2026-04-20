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
import type { KindStore } from '../models/KindStore';

interface KindListProps {
  store: KindStore;
}

export const KindList = observer(({ store }: KindListProps) => {
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
                <Button
                  component={RouterLink}
                  to={`/kinder/${kind.id}`}
                  size="small"
                  variant="outlined"
                  data-testselector={`kind-row-edit-${kind.id}`}
                >
                  Bearbeiten
                </Button>
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
    </Box>
  );
});
