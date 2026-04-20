import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';

interface BeStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  testPrefix: string;
}

export const BeStepper = observer(
  ({ value, onIncrement, onDecrement, testPrefix }: BeStepperProps) => {
    return (
      <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            aria-label="BE verringern"
            data-testselector={`${testPrefix}-minus`}
            onClick={onDecrement}
            color="primary"
          >
            <RemoveIcon />
          </IconButton>
          <Typography
            component="span"
            data-testselector={testPrefix}
            aria-live="polite"
            variant="h5"
            sx={{ minWidth: 32, textAlign: 'center' }}
          >
            {value}
          </Typography>
          <IconButton
            aria-label="BE erhöhen"
            data-testselector={`${testPrefix}-plus`}
            onClick={onIncrement}
            color="primary"
          >
            <AddIcon />
          </IconButton>
        </Stack>
      </Paper>
    );
  },
);
