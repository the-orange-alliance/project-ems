import { StrictMode, useMemo, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { Provider as ModalProvider } from '@ebay/nice-modal-react';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import App from './App';
import { fgcTheme } from './AppTheme';
import { darkModeAtom } from './stores/NewRecoil';
import { APIOptions, SocketOptions } from '@toa-lib/client';
import { getFromLocalStorage } from './stores/LocalStorage';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);

// Configure lib-ems
if (getFromLocalStorage('followerMode', false)) {
  APIOptions.host = getFromLocalStorage(
    'leaderApiHost',
    `http://${window.location.hostname}`
  );
  console.warn('FOLLOWER MODE DETECTED: SETTING API HOST FROM LOCAL STORAGE');
} else {
  APIOptions.host = `http://${getFromLocalStorage(
    'ems:host',
    window.location.hostname
  )}`;
}
APIOptions.port = 8080;
SocketOptions.host = window.location.hostname;
SocketOptions.port = 8081;

function Main() {
  const darkMode = useRecoilValue(darkModeAtom);
  return (
    <ThemeProvider theme={useMemo(() => fgcTheme(darkMode), [darkMode])}>
      <ModalProvider>
        <App />
      </ModalProvider>
    </ThemeProvider>
  );
}

root.render(
  <StrictMode>
    <RecoilRoot>
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <Suspense>
            <Main />
          </Suspense>
        </LocalizationProvider>
      </BrowserRouter>
    </RecoilRoot>
  </StrictMode>
);
