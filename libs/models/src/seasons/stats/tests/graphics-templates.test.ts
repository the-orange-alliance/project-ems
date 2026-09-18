/**
 * Regression test for the template-variable resolution layer
 * (base/GraphicsTemplates.ts). This code decides which team's numbers
 * appear on live television: a resolution bug either crashes a query or,
 * far worse, silently shows the wrong subject's data on air.
 *
 * Placed under seasons/stats/tests (not base/tests) because the package
 * `test` script globs only `build/seasons/stats/tests/*.test.js` -- see
 * libs/models/package.json. A file under src/base/tests would compile but
 * never run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSpec,
  unresolvedBindings,
  timelineBoundVariables,
  isTemplatedTimeline,
  SELECTOR_FOR_KIND,
  type VariableValues
} from '../../../base/GraphicsTemplates.js';
import {
  graphicSpecZod,
  type GraphicSpec,
  type Timeline
} from '../../../base/Graphics.js';
import { selectorsSchema } from '../types.js';

function baseSpec(overrides: Partial<GraphicSpec> = {}): GraphicSpec {
  return {
    id: 'test-spec',
    title: 'Test',
    stat: 'A1',
    selectors: {},
    filters: {},
    params: {},
    kind: 'stat-tile',
    mode: 'fullscreen',
    options: {},
    ...overrides
  };
}

function baseTimeline(items: GraphicSpec[]): Timeline {
  return {
    timelineId: 't1',
    eventKey: 'e1',
    name: 'Timeline',
    items,
    updatedAtUtc: '2026-09-01T00:00:00.000Z'
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const v of Object.values(value as Record<string, unknown>)) {
      deepFreeze(v);
    }
    Object.freeze(value);
  }
  return value;
}

// 1. Happy path.
test('happy path: a bound selector resolves to the supplied value', () => {
  const spec = baseSpec({ bindings: { teamKey: 'featured' } });
  const values: VariableValues = { featured: 1234 };
  const result = resolveSpec(spec, values);
  assert.equal(result.selectors.teamKey, 1234);
});

// 2. `bindings` is always stripped, and the result still validates.
test('bindings is always stripped from the resolved spec, which still parses as a valid GraphicSpec', () => {
  const spec = baseSpec({ bindings: { teamKey: 'featured' } });
  const result = resolveSpec(spec, { featured: 1234 });
  assert.equal(
    'bindings' in result,
    false,
    'resolved spec must have no bindings property at all, not merely bindings === undefined'
  );
  const parsed = graphicSpecZod.safeParse(result);
  assert.ok(
    parsed.success,
    'resolved spec failed strict graphicSpecZod: ' +
      (parsed.success ? '' : JSON.stringify(parsed.error.issues))
  );
});

// 3. THE MOST IMPORTANT ASSERTION IN THE FILE: unresolved leaves the
// selector key ABSENT, never 0, never the variable name string.
test('an unresolved binding leaves the selector key absent, never 0 and never the variable name', () => {
  const spec = baseSpec({ bindings: { teamKey: 'featured' } });
  const result = resolveSpec(spec, {});
  assert.equal(
    'teamKey' in result.selectors,
    false,
    'unresolved teamKey must be absent from selectors entirely'
  );
  assert.notEqual(
    (result.selectors as Record<string, unknown>).teamKey,
    0,
    'unresolved teamKey must never be written as 0 (0 would query team 0 live on air)'
  );
  assert.notEqual(
    (result.selectors as Record<string, unknown>).teamKey,
    'featured',
    'unresolved teamKey must never be written as the raw variable name'
  );
});

// 4. Invalid values are treated as unresolved.
test('invalid values (0, negative, fractional, NaN, non-number) are all treated as unresolved', () => {
  const invalidValues: unknown[] = [0, -5, 1.5, NaN, 'not-a-number'];
  for (const bad of invalidValues) {
    const spec = baseSpec({ bindings: { teamKey: 'featured' } });
    const values = { featured: bad } as unknown as VariableValues;
    const result = resolveSpec(spec, values);
    assert.equal(
      'teamKey' in result.selectors,
      false,
      `value ${JSON.stringify(bad)} must leave teamKey absent from selectors`
    );
    assert.deepEqual(
      unresolvedBindings(spec, values),
      ['featured'],
      `value ${JSON.stringify(bad)} must be reported by unresolvedBindings`
    );
  }
});

// 5. unresolvedBindings returns variable NAMES, distinct, empty when all resolve.
test('unresolvedBindings returns distinct variable names and is empty once everything resolves', () => {
  // Two different selector keys bound to the SAME variable name, both
  // unresolved: must be reported once, not twice (distinct).
  const dupeSpec = baseSpec({
    bindings: { teamKey: 'featured', matchId: 'featured' }
  });
  assert.deepEqual(unresolvedBindings(dupeSpec, {}), ['featured']);

  const resolvedSpec = baseSpec({
    bindings: { teamKey: 'featuredTeam', matchId: 'featuredMatch' }
  });
  assert.deepEqual(
    unresolvedBindings(resolvedSpec, { featuredTeam: 1, featuredMatch: 2 }),
    []
  );
});

// 6. Binding wins over a stale literal; when unsupplied, must end up absent
// (never fall back to the stale literal -- that would put the previous
// subject's data on air).
test('a binding wins over a stale literal selector, and falling unresolved never falls back to it', () => {
  const spec = baseSpec({
    selectors: { teamKey: 999 },
    bindings: { teamKey: 'featured' }
  });

  const resolved = resolveSpec(spec, { featured: 42 });
  assert.equal(resolved.selectors.teamKey, 42);

  const unresolved = resolveSpec(spec, {});
  assert.equal(
    'teamKey' in unresolved.selectors,
    false,
    'teamKey must end up absent, not fall back to the stale literal 999'
  );
  assert.notEqual(
    (unresolved.selectors as Record<string, unknown>).teamKey,
    999
  );
});

// 7. Unbound literals survive.
test('a literal selector with no corresponding binding is preserved unchanged', () => {
  const spec = baseSpec({
    selectors: { matchId: 55 },
    bindings: { teamKey: 'featured' }
  });
  const result = resolveSpec(spec, {});
  assert.equal(result.selectors.matchId, 55);
});

// 8. All three kinds work, consistent with SELECTOR_FOR_KIND.
test('all three binding kinds (team, match, alliance) resolve consistently with SELECTOR_FOR_KIND', () => {
  assert.deepEqual(SELECTOR_FOR_KIND, {
    team: 'teamKey',
    match: 'matchId',
    alliance: 'allianceSeed'
  });
  const spec = baseSpec({
    bindings: { teamKey: 'team1', matchId: 'match1', allianceSeed: 'alliance1' }
  });
  const result = resolveSpec(spec, { team1: 5, match1: 6, alliance1: 7 });
  assert.equal(result.selectors.teamKey, 5);
  assert.equal(result.selectors.matchId, 6);
  assert.equal(result.selectors.allianceSeed, 7);
});

// 9. Purity.
test('resolveSpec is pure: does not throw or mutate frozen inputs, and is deterministic', () => {
  const spec = deepFreeze(
    baseSpec({
      selectors: { teamKey: 999 },
      bindings: { teamKey: 'featured' }
    })
  );
  const values = deepFreeze({ featured: 42 });

  assert.doesNotThrow(() => resolveSpec(spec, values));

  const result1 = resolveSpec(spec, values);
  const result2 = resolveSpec(spec, values);
  assert.deepEqual(result1, result2);

  // Inputs remain untouched.
  assert.equal((spec.selectors as Record<string, unknown>).teamKey, 999);
  assert.equal(spec.bindings?.teamKey, 'featured');
  assert.equal(values.featured, 42);
});

// 10. timelineBoundVariables / isTemplatedTimeline.
test('timelineBoundVariables and isTemplatedTimeline: no bindings anywhere', () => {
  const timeline = baseTimeline([baseSpec({ id: 'a' }), baseSpec({ id: 'b' })]);
  assert.deepEqual(timelineBoundVariables(timeline), []);
  assert.equal(isTemplatedTimeline(timeline), false);
});

test('timelineBoundVariables and isTemplatedTimeline: exactly one binding', () => {
  const timeline = baseTimeline([
    baseSpec({ id: 'a', bindings: { teamKey: 'featured' } }),
    baseSpec({ id: 'b' })
  ]);
  assert.deepEqual(timelineBoundVariables(timeline), ['featured']);
  assert.equal(isTemplatedTimeline(timeline), true);
});

test('timelineBoundVariables dedupes a variable referenced by multiple items', () => {
  const timeline = baseTimeline([
    baseSpec({ id: 'a', bindings: { teamKey: 'featured' } }),
    baseSpec({ id: 'b', bindings: { matchId: 'featured' } }),
    baseSpec({ id: 'c', bindings: { allianceSeed: 'other' } })
  ]);
  assert.deepEqual(timelineBoundVariables(timeline).slice().sort(), [
    'featured',
    'other'
  ]);
  assert.equal(isTemplatedTimeline(timeline), true);
});

// Step 3: strictness backstop -- a template token must never be able to
// reach the stats API through the selectors channel itself. `bindings` is
// deliberately a SIBLING field to `selectors` (see GraphicSpec), stripped
// during resolveSpec before any query is built, precisely so that
// selectorsSchema can stay strictly numeric and reject anything
// template-shaped outright -- there is no legal way for an unresolved
// binding to be serialized as a selector value.
test('strictness backstop: selectorsSchema rejects template tokens, zero, and binding-shaped keys', () => {
  // A raw template token string must never validate as a selector value.
  assert.equal(
    selectorsSchema.safeParse({ teamKey: '{{team}}' }).success,
    false
  );
  // 0 must never validate either -- otherwise an unresolved binding could
  // be "successfully" coerced/written as team 0 and slip past validation.
  assert.equal(selectorsSchema.safeParse({ teamKey: 0 }).success, false);
  // .strict() must reject any key outside the fixed selector set,
  // including a hypothetical "teamKeyTemplate" -- bindings belong on
  // GraphicSpec.bindings, never smuggled onto selectors itself.
  assert.equal(
    selectorsSchema.safeParse({ teamKeyTemplate: 'featured' }).success,
    false
  );
});
