import { LayoutMode } from '@toa-lib/models';

/**
 * Full preview, stream score bug in-match, full results - the documented
 * default in `audience.md`.
 */
export const DEFAULT_LAYOUT = `${LayoutMode.FULL}${LayoutMode.STREAM}${LayoutMode.FULL}`;

/**
 * Normalizes the `?layout=` query param into exactly three known
 * `LayoutMode` characters, falling back to `DEFAULT_LAYOUT` for anything else.
 *
 * `URLSearchParams.get` returns `''` (not `null`) for a bare `?layout=`, so a
 * `??` default never fired and every slot silently rendered nothing - a black
 * screen at a live event. The fallback is deliberately whole-string rather
 * than per-slot: degrading `?layout=xsf` to a missing preview would be the
 * same class of invisible failure, where falling all the way back to the
 * documented default is predictable and always shows something.
 */
export function parseLayout(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().toLowerCase();
  const valid = new Set<string>(Object.values(LayoutMode));
  return value.length === 3 && [...value].every((char) => valid.has(char))
    ? value
    : DEFAULT_LAYOUT;
}
