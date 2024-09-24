import { StrictMode, useMemo, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { Provider as ModalProvider } from '@ebay/nice-modal-react';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { fgcTheme, frcTheme, ftcTheme } from './app-theme';
import { darkModeAtom } from './stores/recoil';
import { APIOptions, SocketOptions } from '@toa-lib/client';
import { getFromLocalStorage } from './stores/local-storage';
import { AppContainer } from './App';
import { useCurrentEvent } from './api/use-event-data';
import { CssBaseline } from '@mui/material';

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
  const darkMode = useRecoilValue(darkModeAtom);
  const eventKey = useCurrentEvent().data?.eventKey;
  const theme = !eventKey
    ? fgcTheme
    : eventKey.startsWith('FRC')
    ? frcTheme
    : eventKey.startsWith('FTC')
    ? ftcTheme
    : fgcTheme;
  return (
    <ThemeProvider theme={useMemo(() => theme(darkMode), [darkMode, eventKey])}>
      <CssBaseline />
      <ModalProvider>
        <AppContainer />
      </ModalProvider>
    </ThemeProvider>
  );
}

root.render(
  <StrictMode>
    <Suspense>
      <RecoilRoot>
        <BrowserRouter>
          <LocalizationProvider dateAdapter={AdapterLuxon}>
            <Main />
          </LocalizationProvider>
        </BrowserRouter>
      </RecoilRoot>
    </Suspense>
  </StrictMode>
);
