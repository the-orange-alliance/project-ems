/**
 * localStorage keys the Remote Client Setup QR code copies from the
 * scorekeeper laptop onto a remote client (ref tablet). Each key travels as a
 * query param of the same name. The configurator only writes keys listed
 * here, so a crafted URL can't set anything else. Add new settings here.
 */
export const REMOTE_CONFIG_KEYS = [
  'leaderApiEnabled', // isFollowerAtom
  'leaderApiHost', // followerHostAtom
  'teamIdentifier' // teamIdentifierAtom
] as const;

export type RemoteConfigKey = (typeof REMOTE_CONFIG_KEYS)[number];

export const CONFIGURATOR_PATH = 'configurator';

/**
 * Writes the forwarded keys found in `params` into this browser's
 * localStorage, using the JSON encoding `atomWithStorage` reads back.
 * Booleans round-trip as booleans; everything else is stored as a string.
 */
export const applyRemoteConfig = (params: URLSearchParams) => {
  for (const key of REMOTE_CONFIG_KEYS) {
    const raw = params.get(key);
    if (raw === null) continue;
    const value = raw === 'true' ? true : raw === 'false' ? false : raw.trim();
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const buildConfiguratorUrl = ({
  host,
  eventKey,
  config
}: {
  host: string;
  eventKey: string;
  config: Partial<Record<RemoteConfigKey, string>>;
}) => {
  const { protocol, port } = window.location;
  const url = new URL(
    `${protocol}//${host}${port ? `:${port}` : ''}/${eventKey}/${CONFIGURATOR_PATH}`
  );
  for (const key of REMOTE_CONFIG_KEYS) {
    const value = config[key];
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
};
