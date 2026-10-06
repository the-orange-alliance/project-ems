import { FC, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageLoader } from 'src/components/loading/index.js';
import {
  applyRemoteConfig,
  resolveConfiguratorRedirect
} from './remote-config-params.js';

/**
 * Landing route for the Remote Client Setup QR code. Stores the settings
 * carried in the query string, then hard-reloads into the event home (or the
 * event page named by `?redirect=`) - main.tsx only applies the leader API
 * host at boot, so a client-side navigate would leave the old base URL in
 * place.
 */
export const Configurator: FC = () => {
  const { eventKey } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    applyRemoteConfig(searchParams);
    window.location.replace(
      resolveConfiguratorRedirect(eventKey ?? '', searchParams)
    );
  }, [eventKey, searchParams]);

  return <PageLoader tip='Configuring this device…' />;
};
