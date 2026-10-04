import { beforeEach, describe, expect, it } from 'vitest';
import { getFromLocalStorage } from 'src/stores/local-storage.js';
import {
  applyRemoteConfig,
  buildConfiguratorUrl
} from './remote-config-params.js';

describe('remote client configurator params', () => {
  beforeEach(() => localStorage.clear());

  it('carries each setting as a query param named after its storage key', () => {
    const url = new URL(
      buildConfiguratorUrl({
        host: '10.0.0.20',
        eventKey: 'FGC_2026',
        config: {
          leaderApiEnabled: 'true',
          leaderApiHost: '10.0.0.5:8080',
          teamIdentifier: 'teamNameShort'
        }
      })
    );
    expect(url.hostname).toBe('10.0.0.20');
    expect(url.pathname).toBe('/FGC_2026/configurator');
    expect(url.searchParams.get('leaderApiEnabled')).toBe('true');
    expect(url.searchParams.get('leaderApiHost')).toBe('10.0.0.5:8080');
    expect(url.searchParams.get('teamIdentifier')).toBe('teamNameShort');

    applyRemoteConfig(url.searchParams);
    expect(getFromLocalStorage('leaderApiEnabled', false)).toBe(true);
    expect(getFromLocalStorage('leaderApiHost', '')).toBe('10.0.0.5:8080');
    expect(getFromLocalStorage('teamIdentifier', '')).toBe('teamNameShort');
  });

  it('overwrites stale leader settings when follower mode is off', () => {
    localStorage.setItem('leaderApiEnabled', 'true');
    localStorage.setItem('leaderApiHost', '"stale:8080"');

    applyRemoteConfig(
      new URLSearchParams('leaderApiEnabled=false&leaderApiHost=')
    );
    expect(getFromLocalStorage('leaderApiEnabled', true)).toBe(false);
    expect(getFromLocalStorage('leaderApiHost', 'x')).toBe('');
  });

  it('ignores params that are not forwarded settings', () => {
    applyRemoteConfig(new URLSearchParams('syncApiKey=evil&colorTheme=dark'));
    expect(localStorage.length).toBe(0);
  });
});
