import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { Provider as ModalProvider } from '@ebay/nice-modal-react';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { customfgcTheme } from './app-theme.js';
import { APIOptions, SocketOptions } from '@toa-lib/client';
import { getFromLocalStorage } from './stores/local-storage.js';
import { AppContainer } from './App.js';
import { useCurrentEvent } from './api/use-event-data.js';
import { createStore, Provider, useAtomValue } from 'jotai';
import { darkModeAtom } from './stores/state/ui.js';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);
export const store = createStore();

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

  return (
    <ConfigProvider
      theme={useMemo(() => customfgcTheme(darkMode), [darkMode, eventKey])}
    >
      <ModalProvider>
        <AppContainer />
      </ModalProvider>
    </ConfigProvider>
  );
}

root.render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <Main />
        </LocalizationProvider>
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
