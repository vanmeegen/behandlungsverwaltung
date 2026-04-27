import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const DISPLAY_FONT_FAMILY = '"Lora", Georgia, "Times New Roman", Times, serif';
const BODY_FONT_FAMILY =
  '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif';

const PURPLE_PRIMARY = '#702D77';
const PURPLE_ACTION = '#944B97';
const PURPLE_DARK = '#4F1F55';
const TURQUOISE = '#008CAB';
const TURQUOISE_LIGHT = '#75C8DA';
const TURQUOISE_DARK = '#006681';
const LIGHTSTEELBLUE = '#B0C4DE';

const PURPLE_TINT_SOFT = '#FAF5FA';
const PURPLE_BORDER = 'rgba(112,45,119,0.12)';

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PURPLE_PRIMARY,
      light: PURPLE_ACTION,
      dark: PURPLE_DARK,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: TURQUOISE,
      light: TURQUOISE_LIGHT,
      dark: TURQUOISE_DARK,
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: PURPLE_PRIMARY,
      secondary: '#5A4862',
      disabled: '#B6A6BA',
    },
    divider: PURPLE_BORDER,
    error: { main: '#C0392B', contrastText: '#FFFFFF' },
    warning: { main: '#D08A1E', contrastText: '#FFFFFF' },
    success: { main: '#2E7D5B', contrastText: '#FFFFFF' },
    info: { main: TURQUOISE, contrastText: '#FFFFFF' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: BODY_FONT_FAMILY,
    h1: { fontFamily: DISPLAY_FONT_FAMILY, fontWeight: 700, fontSize: '2.5rem', lineHeight: 1.2 },
    h2: { fontFamily: DISPLAY_FONT_FAMILY, fontWeight: 700, fontSize: '2rem', lineHeight: 1.25 },
    h3: { fontFamily: DISPLAY_FONT_FAMILY, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 700, fontSize: '1.25rem' },
    h6: { fontWeight: 700, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: { minHeight: 44 },
      },
    },
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
          paddingBlock: 8,
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          backgroundColor: PURPLE_ACTION,
          '&:hover': { backgroundColor: PURPLE_PRIMARY },
        },
        outlinedPrimary: {
          borderColor: PURPLE_PRIMARY,
          color: PURPLE_PRIMARY,
          '&:hover': { borderColor: PURPLE_PRIMARY, backgroundColor: 'rgba(112,45,119,0.04)' },
        },
        textPrimary: { color: PURPLE_PRIMARY },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiAppBar: {
      defaultProps: { color: 'default', elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: PURPLE_PRIMARY,
          boxShadow: `0px 4px 4px ${LIGHTSTEELBLUE}80`,
          borderBottom: 'none',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 80,
          '@media (min-width:600px)': { minHeight: 80 },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: PURPLE_TINT_SOFT,
          borderRight: `1px solid ${PURPLE_BORDER}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingLeft: 20,
          borderLeft: '4px solid transparent',
          '&.active': {
            color: TURQUOISE,
            borderLeftColor: TURQUOISE,
            backgroundColor: 'transparent',
            fontWeight: 700,
            '& .MuiListItemText-primary': { fontWeight: 700, color: TURQUOISE },
          },
          '&:hover': { backgroundColor: 'rgba(0,140,171,0.06)' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': { borderColor: 'rgba(112,45,119,0.24)' },
          '&:hover fieldset': { borderColor: PURPLE_ACTION },
          '&.Mui-focused fieldset': { borderColor: PURPLE_PRIMARY, borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(112,45,119,0.72)',
          '&.Mui-focused': { color: PURPLE_PRIMARY },
        },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, size: 'medium' },
    },
    MuiFormControl: {
      defaultProps: { fullWidth: true },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          border: `1px solid ${PURPLE_BORDER}`,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0, variant: 'outlined' },
      styleOverrides: {
        root: { border: `1px solid ${PURPLE_BORDER}` },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: PURPLE_TINT_SOFT,
          '& .MuiTableCell-head': {
            fontFamily: BODY_FONT_FAMILY,
            fontWeight: 700,
            color: PURPLE_PRIMARY,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid rgba(112,45,119,0.08)' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: DISPLAY_FONT_FAMILY,
          color: PURPLE_PRIMARY,
          fontWeight: 700,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: TURQUOISE },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': { color: TURQUOISE },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: 'rgba(112,45,119,0.24)',
          '&.Mui-active': { color: TURQUOISE },
          '&.Mui-completed': { color: PURPLE_PRIMARY },
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': { color: TURQUOISE, fontWeight: 700 },
          '&.Mui-completed': { color: PURPLE_PRIMARY },
        },
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
