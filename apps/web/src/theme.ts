import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#0f766e' },
    secondary: { main: '#0369a1' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: { minHeight: 44 },
      },
    },
    MuiButton: {
      defaultProps: { variant: 'contained' },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, size: 'medium' },
    },
    MuiFormControl: {
      defaultProps: { fullWidth: true },
    },
  },
});
