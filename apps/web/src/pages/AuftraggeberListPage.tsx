import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { AuftraggeberList } from '../components/AuftraggeberList';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';

interface AuftraggeberListPageProps {
  store: AuftraggeberStore;
}

export const AuftraggeberListPage = observer(({ store }: AuftraggeberListPageProps) => {
  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.loading && store.items.length === 0) {
    return (
      <Box role="status" sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <CircularProgress size={20} />
        <Typography>Lade Auftraggeber…</Typography>
      </Box>
    );
  }

  return <AuftraggeberList store={store} />;
});
