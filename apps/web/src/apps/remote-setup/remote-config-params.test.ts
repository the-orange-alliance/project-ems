import { beforeEach, describe, expect, it } from 'vitest';
import { getFromLocalStorage } from 'src/stores/local-storage.js';
import {
  applyRemoteConfig,
  buildConfiguratorUrl,
  resolveConfiguratorRedirect
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

describe('configurator redirect', () => {
  const resolve = (query: string) =>
    resolveConfiguratorRedirect('FGC_2026', new URLSearchParams(query));

  it('goes to the event home without a redirect', () => {
    expect(resolve('')).toBe('/FGC_2026');
    expect(resolve('redirect=')).toBe('/FGC_2026');
  });

  it('appends the redirect after the event key, keeping its query string', () => {
    const query = new URLSearchParams({
      leaderApiEnabled: 'true',
      redirect: 'audience?possibleQueryParam=123'
    });
    expect(resolve(query.toString())).toBe(
      '/FGC_2026/audience?possibleQueryParam=123'
    );
    expect(resolve('redirect=/audience')).toBe('/FGC_2026/audience');
  });

  it('falls back to the event home for redirects that escape the event', () => {
    expect(resolve('redirect=//evil.com/x')).toBe('/FGC_2026/evil.com/x');
    expect(resolve('redirect=../OTHER_EVENT')).toBe('/FGC_2026');
    expect(resolve('redirect=https://evil.com')).toBe(
      '/FGC_2026/https://evil.com'
    );
  });
});
