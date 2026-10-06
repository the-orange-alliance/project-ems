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
import { App as AntApp, ConfigProvider, theme } from 'antd';
import 'antd/dist/reset.css';
import { localClient, remoteClient } from './api/http-clients.js';
import { normalizeRemoteApiHost } from './util/remote-api-host.js';

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
  // Stored as a bare `host:port`; without a scheme fetch() would treat it as
  // a relative path and hit this page's own origin.
  localClient.setBaseUrl(normalizeRemoteApiHost(leaderApiHost));

  localStorage.setItem('leaderApiEnabled', 'true');
  localStorage.setItem('leaderApiHost', `"${leaderApiHost}"`);
  console.warn(`[EMS]: Leader API host set to ${leaderApiHost}`);
}

if (remoteApiHost) {
  const host = remoteApiHost;
  remoteClient.setBaseUrl(host);

  localStorage.setItem('remoteApiHost', `"${host}"`);
  console.warn(`[EMS]: Remote API host set to ${host}`);
}

if (import.meta.env.VITE_API_URL) {
  localClient.setBaseUrl(import.meta.env.VITE_API_URL);
  console.warn(`[EMS]: Local api url set to ${import.meta.env.VITE_API_URL}`);
}

SocketOptions.host = window.location.hostname;
SocketOptions.port = 8081;

// Rendered before route content so ChromaLayout's later `body` rule still wins.
function ThemedBody({ darkMode }: { darkMode: boolean }) {
  const { token } = theme.useToken();
  return (
    <style>{`html { color-scheme: ${darkMode ? 'dark' : 'light'}; } body { background: ${token.colorBgLayout}; }`}</style>
  );
}

function Main() {
  const darkMode = useAtomValue(darkModeAtom);
  const eventKey = useCurrentEvent().data?.eventKey;

  return (
    <ConfigProvider
      theme={useMemo(() => customfgcTheme(darkMode), [darkMode, eventKey])}
    >
      <AntApp component={false}>
        <ThemedBody darkMode={darkMode} />
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
