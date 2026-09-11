/**
 * The combined FGC2026 semantic presentation registry.
 *
 * Four sibling modules each own an explicit, typed `SemanticRegistration`
 * for a disjoint slice of the 232-row catalogue:
 *
 *   - `./fgc2026-a-d.ts`  (A1-A42, B1-B22, C1-C22, D1-D9   — 95 ids)
 *   - `./fgc2026-e-h.ts`  (E1-E13, F1-F17, G1-G14, H1-H14  — 58 ids)
 *   - `./fgc2026-i-l.ts`  (I1-I10, J1-J15, K1-K13, L1-L14  — 52 ids)
 *   - `./fgc2026-m.ts`    (M1-M27                          — 27 ids)
 *
 * This module is the ONLY place those four are merged. It does not alter
 * any of them — it just assembles their exports (whose names each module
 * chose independently) into one lookup keyed by `semanticRegistrationKey`,
 * fails loudly at import time on any key collision, and exposes the single
 * function (`prepareGraphicFrame`) that the production path calls instead
 * of talking to the legacy generic adapter directly.
 *
 * `adapters.ts`'s `adaptResult` is left completely unchanged and keeps
 * working exactly as documented there — it is still the fallback for any
 * catalogue id with no semantic registration (there are none today, since
 * every FGC2026 id is covered, but the generic fallback remains the
 * contract for a future catalogue id added without a registration yet).
 */
import { FGC2026_A_D_REGISTRATIONS } from './fgc2026-a-d.js';
import { FGC2026_E_H_SEMANTIC_REGISTRATIONS } from './fgc2026-e-h.js';
import { FGC2026_I_L_REGISTRATIONS } from './fgc2026-i-l.js';
import { fgc2026MRegistrations } from './fgc2026-m.js';
import {
  semanticRegistrationKey,
  type SemanticRegistration
} from './semantic-helpers.js';
import { adaptResult, type AdaptContext } from './adapters.js';
import type { GraphicSpec, VizFrame } from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';

/** The only season this package currently ships presentation semantics for. */
export const FGC2026_SEASON_KEY = 'fgc_2026';

/** Every registration contributed by the four range modules, concatenated
 * in catalogue order (A-D, E-H, I-L, M). Not deduplicated yet — that
 * happens in `buildSemanticRegistry` below, which is where a collision
 * throws. */
const ALL_REGISTRATIONS: readonly SemanticRegistration[] = [
  ...FGC2026_A_D_REGISTRATIONS,
  ...FGC2026_E_H_SEMANTIC_REGISTRATIONS.values(),
  ...FGC2026_I_L_REGISTRATIONS,
  ...fgc2026MRegistrations
];

/**
 * Merges a list of registrations into one lookup keyed by
 * `semanticRegistrationKey(seasonKey, catalogueId)`, throwing IMMEDIATELY
 * (module load time, not first-use time) if two registrations claim the
 * same season + catalogue id. A silent last-write-wins merge would let one
 * sibling module's work quietly shadow another's without anyone noticing —
 * unacceptable for a broadcast-facing registry.
 */
export function buildSemanticRegistry(
  registrations: readonly SemanticRegistration[]
): ReadonlyMap<string, SemanticRegistration> {
  const map = new Map<string, SemanticRegistration>();
  const duplicates: string[] = [];
  for (const registration of registrations) {
    const key = semanticRegistrationKey(
      registration.seasonKey,
      registration.catalogueId
    );
    if (map.has(key)) {
      duplicates.push(`${registration.seasonKey}/${registration.catalogueId}`);
      continue;
    }
    map.set(key, registration);
  }
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate semantic presentation registrations for: ${duplicates.join(', ')}. ` +
        'Each (seasonKey, catalogueId) pair must be registered exactly once across ' +
        'fgc2026-a-d.ts / fgc2026-e-h.ts / fgc2026-i-l.ts / fgc2026-m.ts.'
    );
  }
  return map;
}

/** The merged, deduplicated registry — every FGC2026 catalogue id that has
 * an explicit semantic registration, keyed for O(1) lookup. Built (and
 * duplicate-checked) once at module load. */
export const SEMANTIC_PRESENTATION_REGISTRY: ReadonlyMap<
  string,
  SemanticRegistration
> = buildSemanticRegistry(ALL_REGISTRATIONS);

/** Looks up the explicit registration for a season + catalogue id, or
 * `undefined` when none exists (the generic fallback's territory). */
export function semanticRegistrationFor(
  seasonKey: string,
  catalogueId: string
): SemanticRegistration | undefined {
  return SEMANTIC_PRESENTATION_REGISTRY.get(
    semanticRegistrationKey(seasonKey, catalogueId)
  );
}

/**
 * THE production entry point. Replaces a direct call to `adaptResult` at
 * every real call site (see `apps/web/src/apps/graphics-controller/use-cue.ts`):
 *
 *   - A catalogue id with an explicit semantic registration ALWAYS resolves
 *     through that registration's `adapt()`, never the generic fallback.
 *     `adapt()` (via `createSemanticFrame` / `requireOkResult` in
 *     `./semantic-helpers.ts`) throws a `SemanticPreparationError` — never
 *     returns an empty-but-`ready` frame — for a non-ok source result, an
 *     unsupported kind/mode combination, or any other invalid payload. That
 *     error is meant to propagate to the caller's own error handling (the
 *     producer sees an actionable message), not to be swallowed here.
 *   - A catalogue id with no registration falls back to the legacy
 *     `adaptResult`, unchanged, which keeps its own "never throws, degrades
 *     to an empty valid frame" contract exactly as documented in
 *     `./adapters.ts`.
 */
export function prepareGraphicFrame(
  result: StatResult,
  spec: GraphicSpec,
  ctx: AdaptContext
): VizFrame {
  const registration = semanticRegistrationFor(
    FGC2026_SEASON_KEY,
    ctx.catalogueId
  );
  if (registration) {
    return registration.adapt(result, spec, ctx);
  }
  return adaptResult(result, spec, ctx);
}
