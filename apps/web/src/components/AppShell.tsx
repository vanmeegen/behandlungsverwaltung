import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';
import type { ElementType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import type { UiStore } from '../models/UiStore';
import { APP_VERSION, BUILD_DATE, GIT_SHA } from '../version';

interface NavEntry {
  to: string;
  label: string;
  testId: string;
  end?: boolean;
}

const NAV_ENTRIES: readonly NavEntry[] = [
  { to: '/behandlungen', label: 'Behandlungen', testId: 'nav-behandlungen' },
  { to: '/kinder', label: 'Kinder', testId: 'nav-kinder' },
  { to: '/auftraggeber', label: 'Auftraggeber', testId: 'nav-auftraggeber' },
  { to: '/therapien', label: 'Therapien', testId: 'nav-therapien' },
  { to: '/vorlagen', label: 'Vorlagen', testId: 'nav-vorlagen' },
  { to: '/rechnungen/neu', label: 'Rechnung erstellen', testId: 'nav-rechnung-neu' },
  { to: '/rechnungen', label: 'Rechnungsübersicht', testId: 'nav-rechnungen', end: true },
  {
    to: '/rechnungen/download',
    label: 'Rechnungen herunterladen',
    testId: 'nav-rechnungen-download',
  },
  { to: '/stundennachweis', label: 'Stundennachweis', testId: 'nav-stundennachweis' },
];

const DRAWER_WIDTH = 260;

interface AppShellProps {
  uiStore: UiStore;
}

export const AppShell = observer(({ uiStore }: AppShellProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const navList = (
    <List data-testselector="nav">
      {NAV_ENTRIES.map((entry) => (
        <ListItemButton
          key={entry.to}
          component={NavLink as ElementType}
          to={entry.to}
          end={entry.end ?? false}
          data-testselector={entry.testId}
          onClick={uiStore.closeDrawer}
        >
          <ListItemText primary={entry.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: 80, gap: 2 }}>
          {!isDesktop && (
            <IconButton
              color="inherit"
              aria-label="Navigation öffnen"
              edge="start"
              onClick={uiStore.toggleDrawer}
              data-testselector="nav-toggle"
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Tooltip
            title={
              <Box
                component="span"
                sx={{ display: 'block', whiteSpace: 'pre-line', textAlign: 'left' }}
                data-testselector="app-version-tooltip"
              >
                {`Version v${APP_VERSION}\nCommit ${GIT_SHA}\nBuild ${BUILD_DATE}`}
              </Box>
            }
            arrow
            placement="bottom-start"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'help' }}>
              <Box
                component="img"
                src="/logo.png"
                alt="bewegtes Lernen"
                sx={{ height: 56, width: 'auto', display: 'block' }}
              />
              <Typography
                variant="h6"
                component="h1"
                noWrap
                sx={{ fontFamily: '"Lora", Georgia, serif', fontWeight: 700 }}
              >
                Behandlungsverwaltung
              </Typography>
            </Box>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : uiStore.drawerOpen}
        onClose={uiStore.closeDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar sx={{ minHeight: 80 }} />
        {navList}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar sx={{ minHeight: 80 }} />
        <Container maxWidth="md" sx={{ py: 3 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
});
