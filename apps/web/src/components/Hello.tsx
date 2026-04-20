import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import type { HelloModel } from '../models/HelloModel';

interface HelloProps {
  model: HelloModel;
}

export const Hello = observer(({ model }: HelloProps) => {
  useEffect(() => {
    void model.load();
  }, [model]);

  if (model.loading) {
    return (
      <Box
        role="status"
        data-testselector="hello-loading"
        sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
      >
        <CircularProgress size={24} />
        <Typography>Lade…</Typography>
      </Box>
    );
  }
  if (model.error) {
    return (
      <Alert severity="error" role="alert" data-testselector="hello-error">
        Fehler: {model.error}
      </Alert>
    );
  }
  return (
    <Typography variant="h4" component="h1" data-testselector="hello-greeting">
      {model.message}
    </Typography>
  );
});
