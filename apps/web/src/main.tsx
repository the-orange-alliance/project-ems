import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ModalProvider } from '@ebay/nice-modal-react';
import { customfgcTheme } from './app-theme.js';
import { SocketOptions } from '@toa-lib/client';
import { getFromLocalStorage } from './stores/local-storage.js';
import { AppContainer } from './App.js';
import { useCurrentEvent } from './api/use-event-data.js';
import { createStore, Provider, useAtomValue } from 'jotai';
import { darkModeAtom } from './stores/state/ui.js';
import { App as AntApp, ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import { localClient, remoteClient } from './api/http-clients.js';

const container = document.getElementById('root');
if (!container) throw new Error('Error while trying to find document root.');
const root = createRoot(container);
export const store = createStore();

const searchParams = new URLSearchParams(window.location.search);
const leaderApiHostQP = searchParams.get('leaderApiHost');
const leaderApiHost =
  leaderApiHostQP || getFromLocalStorage('leaderApiHost', false);
const remoteApiHost = getFromLocalStorage('remoteApiHost', false);

if (leaderApiHost) {
  localClient.setBaseUrl(leaderApiHost);

  localStorage.setItem('leaderApiEnabled', 'true');
  localStorage.setItem('leaderApiHost', `"${leaderApiHost}"`);
  console.warn(`[EMS]: Leader API host set to ${leaderApiHost}`);
}

if (remoteApiHost) {
  remoteClient.setBaseUrl(remoteApiHost);

  localStorage.setItem('remoteApiHost', `"${remoteApiHost}"`);
  console.warn(`[EMS]: Remote API host set to ${remoteApiHost}`);
}

SocketOptions.host = window.location.hostname;
SocketOptions.port = 8081;

function Main() {
  const darkMode = useAtomValue(darkModeAtom);
  const eventKey = useCurrentEvent().data?.eventKey;

  return (
    <ConfigProvider
      theme={useMemo(() => customfgcTheme(darkMode), [darkMode, eventKey])}
    >
      <AntApp component={false}>
        <ModalProvider>
          <AppContainer />
        </ModalProvider>
      </AntApp>
    </ConfigProvider>
  );
}

root.render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <Main />
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
