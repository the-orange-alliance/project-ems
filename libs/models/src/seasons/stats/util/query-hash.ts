import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json.js';

/**
 * Server-only: hashes a canonical JSON value. This lives outside
 * `canonical-json.ts` (and outside the `seasons/stats` barrel) so that the
 * browser bundle never pulls `node:crypto` in through a barrel import.
 */
export const queryHash = (v: unknown) =>
  createHash('sha256').update(canonicalJson(v)).digest('hex');
