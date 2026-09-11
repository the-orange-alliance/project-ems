/**
 * Regression test proving the presentation layer (families.ts +
 * presentation.ts + adapters.ts) covers every catalogue id and never
 * crashes on real data.
 *
 * This is cheap to write and maintain because `golden.json` already holds a
 * real, deterministically-computed `StatResult` for all 232 catalogue ids
 * (see `contracts.test.ts`). Reusing it here means every adapter is
 * exercised against genuine data without recomputing anything.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogue } from '../catalogue.js';
import { familyFor } from '../presentation/families.js';
import {
  presentationFor,
  type StatPresentation
} from '../presentation/presentation.js';
import { adaptResult, type AdaptContext } from '../presentation/adapters.js';
import {
  vizFrameZod,
  type GraphicSpec,
  type VizFrame
} from '../../../base/Graphics.js';

const golden: Record<string, unknown> = JSON.parse(
  readFileSync(
    new URL('../../../../src/seasons/stats/tests/golden.json', import.meta.url),
    'utf8'
  )
);

const teams = Array.from({ length: 8 }, (_, i) => ({
  teamKey: i + 1,
  teamNumber: String(i + 1),
  teamNameShort: 'Team ' + (i + 1)
}));

function buildSpec(id: string, presentation: StatPresentation): GraphicSpec {
  return {
    id: 'test-' + id,
    title: presentation.valueLabel,
    stat: id,
    selectors: {},
    filters: {},
    params: {},
    kind: presentation.defaultKind,
    mode: 'fullscreen',
    options: {}
  };
}

function buildCtx(id: string): AdaptContext {
  return {
    catalogueId: id,
    asOfUtc: '2026-09-01T15:00:00.000Z',
    teams,
    matches: []
  };
}

/** Recursively walk every value in `value`, recording the path of any NaN
 * or non-finite number found anywhere in the frame (not just `series`). */
function collectNonFiniteNumbers(
  value: unknown,
  path: string,
  bad: string[]
): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) bad.push(`${path} = ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectNonFiniteNumbers(v, `${path}[${i}]`, bad));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectNonFiniteNumbers(v, `${path}.${k}`, bad);
    }
  }
}

test('presentation layer covers every catalogue id on real golden data', () => {
  assert.equal(catalogue.length, 232, 'catalogue has 232 rows');

  for (const row of catalogue) {
    const id = row.catalogueId;
    const goldenResult = golden[id];
    assert.ok(goldenResult, id + ': golden result present');

    // 1. familyFor returns a valid family and does not throw.
    let family: ReturnType<typeof familyFor> | undefined;
    assert.doesNotThrow(() => {
      family = familyFor(id);
    }, id + ': familyFor threw');
    assert.ok(family, id + ': familyFor returned a family');

    // 2. presentationFor's defaultKind is contained in its own allowedKinds.
    const presentation = presentationFor(id);
    assert.ok(
      presentation.allowedKinds.includes(presentation.defaultKind),
      id +
        ': defaultKind ' +
        presentation.defaultKind +
        ' not in allowedKinds ' +
        presentation.allowedKinds.join(',')
    );

    const spec = buildSpec(id, presentation);
    const ctx = buildCtx(id);

    // 3. adaptResult does not throw against the real golden StatResult.
    let frame: VizFrame | undefined;
    assert.doesNotThrow(() => {
      frame = adaptResult(goldenResult as any, spec, ctx);
    }, id + ': adaptResult threw');
    assert.ok(frame, id + ': adaptResult produced a frame');

    // 4. the returned VizFrame validates against vizFrameZod.
    const parsed = vizFrameZod.safeParse(frame);
    assert.ok(
      parsed.success,
      id +
        ': vizFrameZod rejected frame: ' +
        (parsed.success ? '' : JSON.stringify(parsed.error.issues))
    );

    // 5. no NaN / Infinity anywhere in the frame (not just series).
    const bad: string[] = [];
    collectNonFiniteNumbers(frame, 'frame', bad);
    assert.equal(
      bad.length,
      0,
      id + ': non-finite numbers found at ' + bad.join(', ')
    );

    // 7. adaptResult is deterministic: identical inputs -> identical output.
    const frame2 = adaptResult(goldenResult as any, spec, ctx);
    assert.deepEqual(frame2, frame, id + ': adaptResult is not deterministic');
  }
});

test('D4: null preservation — a genuinely null rate must never render as a measured zero', () => {
  const id = 'D4';
  const presentation = presentationFor(id);
  const spec = buildSpec(id, presentation);
  const ctx = buildCtx(id);
  const frame = adaptResult(golden[id] as any, spec, ctx);

  const rateSeries = frame.series.find((s) => s.name === 'rate');
  assert.ok(rateSeries, 'D4: expected a "rate" series');

  const rateByTeam = new Map<number, number | null>();
  for (const point of rateSeries!.points) {
    const teamKey = (point.meta as any)?.teamKey;
    if (typeof teamKey === 'number') rateByTeam.set(teamKey, point.value);
  }

  // Golden data: team 1 has identifiedMatches: 10, ambiguousMatches: 0,
  // rate: 0 — a genuinely measured zero, must survive as the number 0.
  assert.equal(
    rateByTeam.get(1),
    0,
    'D4 team 1: measured zero rate must render as 0'
  );
  assert.notEqual(
    rateByTeam.get(1),
    null,
    'D4 team 1: measured zero rate must not be null'
  );

  // Golden data: team 5 has identifiedMatches: 0, ambiguousMatches: 11,
  // rate: null — no observation was made, must never be coerced to 0.
  assert.equal(
    rateByTeam.get(5),
    null,
    'D4 team 5: unmeasured rate must stay null, never coerced to 0'
  );
});

test('presentationFor throws on an unknown catalogue id', () => {
  assert.throws(() => presentationFor('ZZ999'));
});

test('adaptResult degrades a failed StatResult to an empty, valid frame without throwing', () => {
  const failure = {
    status: 'unavailable' as const,
    reason: 'test',
    warnings: []
  };
  const id = 'A1';
  const presentation = presentationFor(id);
  const spec = buildSpec(id, presentation);
  const ctx = buildCtx(id);

  let frame: VizFrame | undefined;
  assert.doesNotThrow(() => {
    frame = adaptResult(failure, spec, ctx);
  });
  assert.deepEqual(frame!.series, [], 'degraded frame has empty series');
  assert.equal(
    frame!.quality,
    'degraded',
    'degraded frame reports quality: degraded'
  );
  assert.ok(
    Array.isArray(frame!.notes) && frame!.notes.length > 0,
    'degraded frame carries a note'
  );
  assert.equal(
    frame!.notes![0],
    'test',
    'degraded frame note is the failure reason'
  );

  const parsed = vizFrameZod.safeParse(frame);
  assert.ok(
    parsed.success,
    'degraded frame still validates against vizFrameZod'
  );
});

test('A16: per-row failures are excluded from series and recorded in notes, one note per failure', () => {
  const id = 'A16';
  const goldenEntry = golden[id] as { data: unknown[] };
  const rows = goldenEntry.data;
  assert.equal(rows.length, 14, 'A16 golden row count');

  const failureRows = rows.filter(
    (r) =>
      r &&
      typeof r === 'object' &&
      'status' in (r as Record<string, unknown>) &&
      (r as Record<string, unknown>).status !== 'ok'
  );
  // Observed directly from golden.json: 2 of the 14 A16 rows are failure
  // rows (status: 'insufficient_data'), the other 12 carry a real value.
  assert.equal(failureRows.length, 2, 'A16 golden failure row count');

  const presentation = presentationFor(id);
  const spec = buildSpec(id, presentation);
  const ctx = buildCtx(id);
  const frame = adaptResult(golden[id] as any, spec, ctx);

  const totalPoints = frame.series.reduce((sum, s) => sum + s.points.length, 0);
  assert.equal(
    totalPoints,
    rows.length - failureRows.length,
    'A16: no failure row may become a data point'
  );

  assert.ok(Array.isArray(frame.notes), 'A16: frame.notes present');
  assert.equal(
    frame.notes!.length,
    failureRows.length,
    'A16: one note per failure row'
  );
});
