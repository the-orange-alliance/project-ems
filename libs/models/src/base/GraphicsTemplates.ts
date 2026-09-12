import { z } from 'zod';
import type {
  GraphicSpec,
  Timeline,
  TemplateVariable,
  TemplateVariableKind
} from './Graphics.js';
import { templateVariableZod } from './Graphics.js';

/**
 * Pure resolution layer: turns a templated GraphicSpec (selectors bound to
 * named timeline variables) into a concrete one a stats query can safely run.
 *
 * This module decides which team's numbers appear on live television, so
 * every ambiguous or invalid binding must resolve to an ABSENT selector key,
 * never to a placeholder, a stale literal, or 0.
 */

export type VariableValues = Record<string, number>;

/** Which selector key each variable kind fills BY DEFAULT (e.g. offering a fresh `match` variable to bind first). Not the only selector a kind can fill any more - see `KIND_FOR_SELECTOR` for the reverse, non-bijective direction `teamsInMatchId` needs. */
export const SELECTOR_FOR_KIND = {
  team: 'teamKey',
  match: 'matchId',
  alliance: 'allianceSeed'
} as const satisfies Record<
  TemplateVariableKind,
  keyof NonNullable<GraphicSpec['bindings']>
>;

const BINDING_KEYS = [
  'teamKey',
  'matchId',
  'allianceSeed',
  'teamsInMatchId'
] as const;
type BindingKey = (typeof BINDING_KEYS)[number];

/**
 * Which variable KIND each selector key accepts - the reverse of
 * `SELECTOR_FOR_KIND`, but not its strict inverse: unlike the other three
 * keys, `teamsInMatchId` shares its kind (`match`) with `matchId` rather
 * than owning one exclusively, since "teams in match" is filled by the same
 * kind of variable a match-scoped selector already uses. Used to filter the
 * Variable-mode dropdown for a given selector key (see `graphic-inspector.tsx`'s
 * `variablesForSelector`), where `SELECTOR_FOR_KIND[variable.kind] === key`
 * alone can no longer decide it.
 */
export const KIND_FOR_SELECTOR = {
  teamKey: 'team',
  matchId: 'match',
  allianceSeed: 'alliance',
  teamsInMatchId: 'match'
} as const satisfies Record<BindingKey, TemplateVariableKind>;

/** Record of variable name -> positive integer value supplied at showtime. */
export const variableValuesZod = z.record(
  z.string().min(1),
  z.number().int().positive()
);

/** True only for a value that is safe to write onto a selector. */
function isResolvedValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}

/** Distinct variable names referenced by `spec.bindings` that `values` does not validly supply. */
export function unresolvedBindings(
  spec: GraphicSpec,
  values: VariableValues
): string[] {
  const { bindings } = spec;
  if (!bindings) return [];
  const unresolved = new Set<string>();
  for (const key of BINDING_KEYS) {
    const variableName = bindings[key];
    if (variableName === undefined) continue;
    if (!isResolvedValue(values[variableName])) {
      unresolved.add(variableName);
    }
  }
  return Array.from(unresolved);
}

/** Pure. Writes bound selectors from `values` and returns a spec with `bindings` removed. */
export function resolveSpec(
  spec: GraphicSpec,
  values: VariableValues
): GraphicSpec {
  const { bindings, selectors, ...rest } = spec;
  // Fresh object: never mutate the caller's selectors, and start from its
  // literal values so untouched keys (rule 5) survive unchanged.
  const resolvedSelectors: GraphicSpec['selectors'] = { ...selectors };

  if (bindings) {
    for (const key of BINDING_KEYS) {
      const variableName = bindings[key];
      if (variableName === undefined) continue;
      const value = values[variableName];
      if (isResolvedValue(value)) {
        // Binding wins over any stale literal for this key.
        resolvedSelectors[key] = value;
      } else {
        // Unresolved binding: the key must end up absent, never fall back
        // to a stale literal and never write a placeholder or 0.
        delete resolvedSelectors[key as BindingKey];
      }
    }
  }

  // `bindings` is omitted from `rest` via destructuring above, so the
  // returned object has no `bindings` property at all (not `undefined`).
  return { ...rest, selectors: resolvedSelectors };
}

/** Distinct variable names referenced by any item in the timeline. */
export function timelineBoundVariables(timeline: Timeline): string[] {
  const names = new Set<string>();
  for (const item of timeline.items) {
    const { bindings } = item;
    if (!bindings) continue;
    for (const key of BINDING_KEYS) {
      const name = bindings[key];
      if (name !== undefined) names.add(name);
    }
  }
  return Array.from(names);
}

/** True when any item in the timeline has at least one binding. */
export function isTemplatedTimeline(timeline: Timeline): boolean {
  return timeline.items.some(
    (item) =>
      item.bindings !== undefined && Object.keys(item.bindings).length > 0
  );
}
