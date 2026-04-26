import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { KindForm } from '../components/KindForm';
import type { ErziehungsberechtigterStore } from '../models/ErziehungsberechtigterStore';
import type { KindStore } from '../models/KindStore';

interface KindFormPageProps {
  store: KindStore;
  ezbStore?: ErziehungsberechtigterStore | undefined;
}

export const KindFormPage = observer(({ store, ezbStore }: KindFormPageProps) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) {
      store.startCreate();
      return;
    }
    const existing = store.items.find((k) => k.id === id);
    if (existing) {
      store.startEdit(existing);
      return;
    }
    void store.load().then(() => {
      const loaded = store.items.find((k) => k.id === id);
      if (loaded) store.startEdit(loaded);
    });
  }, [id, store]);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {id ? 'Kind bearbeiten' : 'Neues Kind'}
      </Typography>
      <KindForm store={store} ezbStore={ezbStore} />
    </Box>
  );
});
