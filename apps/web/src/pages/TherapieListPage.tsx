import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { TherapieList } from '../components/TherapieList';
import type { TherapieStore } from '../models/TherapieStore';

interface TherapieListPageProps {
  store: TherapieStore;
}

export const TherapieListPage = observer(({ store }: TherapieListPageProps) => {
  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.loading && store.items.length === 0) {
    return (
      <Box role="status" sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <CircularProgress size={20} />
        <Typography>Lade Therapien…</Typography>
      </Box>
    );
  }

  return (
    <Box data-testselector="therapie-list-page">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          Therapien
        </Typography>
        <Button component={RouterLink} to="/therapien/new" data-testselector="therapie-list-new">
          Neu
        </Button>
      </Stack>
      <TherapieList items={store.items} />
    </Box>
  );
});
