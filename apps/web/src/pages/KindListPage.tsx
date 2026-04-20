import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { KindList } from '../components/KindList';
import type { KindStore } from '../models/KindStore';

interface KindListPageProps {
  store: KindStore;
}

export const KindListPage = observer(({ store }: KindListPageProps) => {
  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.loading && store.items.length === 0) {
    return (
      <Box role="status" sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <CircularProgress size={20} />
        <Typography>Lade Kinder…</Typography>
      </Box>
    );
  }

  return <KindList store={store} />;
});
