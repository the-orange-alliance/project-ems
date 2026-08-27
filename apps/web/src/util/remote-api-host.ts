/**
 * Normalizes a user-provided remote API host into a fetchable URL.
 *
 * The "Remote API URL" setting is entered the same way as the "Leader Api
 * Host" setting - a bare `host` or `host:port`, with no protocol. If that
 * raw value is handed to fetch() with no scheme, it treats it as a relative
 * path and silently sends the request to the current page's own
 * origin/port instead of the remote one.
 *
 * Pass the normalized result as the `host` argument to `apiFetcher` (or a
 * wrapper like `getTeams`/`getMatchSchedule`) rather than swapping
 * `APIOptions.host` globally - that shared module state races with any
 * other in-flight or concurrently triggered request (e.g. SWR revalidating
 * on window focus) that reads the same value mid-swap.
 */
export const normalizeRemoteApiHost = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
};
