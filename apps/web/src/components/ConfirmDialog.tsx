import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testSelector?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ja',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
  testSelector,
}: ConfirmDialogProps): JSX.Element {
  const baseSelector = testSelector ?? 'confirm-dialog';
  return (
    <Dialog open={open} onClose={onCancel} data-testselector={baseSelector}>
      <DialogTitle data-testselector={`${baseSelector}-title`}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText data-testselector={`${baseSelector}-message`}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} data-testselector={`${baseSelector}-cancel`}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          data-testselector={`${baseSelector}-confirm`}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
