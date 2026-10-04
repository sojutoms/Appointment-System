import { createTheme } from '@mui/material/styles';

// App-wide MUI theme: brand colours, typography and component defaults.
// CSS variables + two colour schemes give us a light/dark toggle for free.
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#4f46e5', dark: '#4338ca', light: '#818cf8', contrastText: '#fff' },
        secondary: { main: '#0ea5e9' },
        background: { default: '#f8fafc', paper: '#ffffff' },
        text: { primary: '#0f172a', secondary: '#475569' },
        divider: '#e2e8f0',
      },
    },
    dark: {
      palette: {
        primary: { main: '#818cf8', dark: '#6366f1', light: '#a5b4fc', contrastText: '#0b1020' },
        secondary: { main: '#38bdf8' },
        background: { default: '#0b1020', paper: '#121a2f' },
        text: { primary: '#e2e8f0', secondary: '#94a3b8' },
        divider: 'rgba(148, 163, 184, 0.18)',
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 }, sizeLarge: { paddingBlock: 10 } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 14 } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600 } } },
    MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});

export default theme;
