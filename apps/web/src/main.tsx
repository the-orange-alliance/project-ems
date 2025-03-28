import { StrictMode, useMemo, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { Provider as ModalProvider } from '@ebay/nice-modal-react';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { customfgcTheme, fgcTheme, frcTheme, ftcTheme } from './app-theme.js';
import { APIOptions, SocketOptions } from '@toa-lib/client';
import { getFromLocalStorage } from './stores/local-storage.js';
import { AppContainer } from './App.js';
import { useCurrentEvent } from './api/use-event-data.js';
import { CssBaseline } from '@mui/material';
import { useAtomValue } from 'jotai';
import { darkModeAtom } from './stores/state/ui.js';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { ConfigProvider, theme } from 'antd';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);

// Configure lib-ems
if (getFromLocalStorage('followerMode', false)) {
  APIOptions.host = `http://${getFromLocalStorage(
    'leaderApiHost',
    `http://${window.location.hostname}`
  )}`;
  console.warn(
    `FOLLOWER MODE DETECTED: SETTING API HOST FROM LOCAL STORAGE\n${APIOptions.host}`
  );
} else {
  APIOptions.host = `http://${window.location.hostname}`;
}
APIOptions.port = 8080;
SocketOptions.host = window.location.hostname;
SocketOptions.port = 8081;

function Main() {
  const darkMode = useAtomValue(darkModeAtom);
  const eventKey = useCurrentEvent().data?.eventKey;
  const oldTheme = !eventKey
    ? fgcTheme
    : eventKey.startsWith('FRC')
      ? frcTheme
      : eventKey.startsWith('FTC')
        ? ftcTheme
        : fgcTheme;

  const appTheme = customfgcTheme;

  return (
    <ThemeProvider
      theme={useMemo(() => oldTheme(darkMode), [darkMode, eventKey])}
    >
      <CssBaseline />
      <ModalProvider>
        <ConfigProvider theme={appTheme}>
          <ConfigProvider
            theme={{
              algorithm: darkMode
                ? [theme.darkAlgorithm, theme.compactAlgorithm]
                : [theme.compactAlgorithm]
            }}
          >
            <AppContainer />
          </ConfigProvider>
        </ConfigProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}

root.render(
  <StrictMode>
    <Suspense>
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <Main />
        </LocalizationProvider>
      </BrowserRouter>
    </Suspense>
  </StrictMode>
);
