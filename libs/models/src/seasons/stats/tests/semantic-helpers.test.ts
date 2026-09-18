import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayElementId,
  booleanNumber,
  categoricalData,
  createSemanticFrame,
  flattenTableRows,
  formatSemanticCell,
  histogramData,
  lineData,
  matchEntity,
  numberFormat,
  numericCell,
  percentFormat,
  requireOkResult,
  scalarData,
  semanticRegistrationKey,
  stableEntityId,
  tableCell,
  tableData,
  teamEntity,
  textCell
} from '../presentation/semantic-helpers.js';
import type { GraphicSpec } from '../../../base/Graphics.js';
const ctx = {
  catalogueId: 'TEST',
  asOfUtc: '2026-09-09T12:00:00.000Z',
  teams: [
    { teamKey: 1, teamNameShort: 'Same' },
    { teamKey: 2, teamNameShort: 'Same' }
  ],
  matches: [
    { tournamentKey: 'q', id: 1, name: 'Match 1' },
    { tournamentKey: 'f', id: 1, name: 'Match 1' }
  ]
};
const spec: GraphicSpec = {
  id: 'test',
  title: 'Test',
  stat: 'TEST',
  selectors: {},
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'fullscreen',
  options: {}
};
const result = {
  status: 'ok' as const,
  data: null,
  warnings: [],
  quality: 'complete' as const
};
const measure = {
  id: 'score',
  label: 'Score',
  format: numberFormat(1, 'points')
};

test('typed cells preserve text, boolean, zero and null and reject accidental coercion', () => {
  assert.equal(tableCell('Robot 1'), 'Robot 1');
  assert.equal(textCell('US'), 'US');
  assert.equal(numericCell(0), 0);
  assert.equal(numericCell(undefined), null);
  assert.equal(tableCell(false), false);
  assert.equal(booleanNumber(false), 0);
  for (const value of ['12', {}, [], NaN, Infinity])
    assert.throws(() => numericCell(value));
  assert.throws(() => tableCell({ score: 10 }));
});

test('source identities do not depend on labels, ambiguous delimiters, or season collisions', () => {
  assert.notEqual(teamEntity(1, ctx).id, teamEntity(2, ctx).id);
  assert.notEqual(matchEntity('q', 1, ctx).id, matchEntity('f', 1, ctx).id);
  assert.notEqual(
    stableEntityId('x', 'a:b', 'c'),
    stableEntityId('x', 'a', 'b:c')
  );
  assert.notEqual(
    semanticRegistrationKey('2026', 'A1'),
    semanticRegistrationKey('2027', 'A1')
  );
  assert.notEqual(
    arrayElementId('team-1', 'bins', 0),
    arrayElementId('team-1', 'bins', 1)
  );
});

test('one categorical sort and limit preserves shared domain alignment and explicit missingness', () => {
  const entities = [teamEntity(1, ctx), teamEntity(2, ctx)];
  const data = categoricalData(
    'grouped-bar',
    entities,
    [
      {
        id: 'a',
        label: 'A',
        measure,
        points: [
          { entityId: entities[0].id, value: 2 },
          { entityId: entities[1].id, value: 7 }
        ]
      },
      {
        id: 'b',
        label: 'B',
        measure,
        points: [{ entityId: entities[0].id, value: 0 }]
      }
    ],
    { sort: { seriesId: 'a', direction: 'desc' }, limit: 1 }
  );
  assert.deepEqual(data.entities, [entities[1]]);
  assert.equal(data.series[0].points[0].value, 7);
  assert.equal(data.series[1].points[0].value, null);
  assert.equal(entities[0].id, teamEntity(1, ctx).id);
  assert.throws(() =>
    categoricalData('bar', entities, [
      {
        id: 'a',
        label: 'A',
        measure,
        points: [{ entityId: 'unknown', value: 1 }]
      }
    ])
  );
});

test('line coordinates preserve negative offsets, all samples and per-entity series', () => {
  const points = Array.from({ length: 12 }, (_, index) => ({
    x: 6 - index,
    value: index === 3 ? null : index
  }));
  const data = lineData('number', [
    {
      id: 'match-q-1',
      label: 'Match 1',
      measure,
      interpolation: 'step',
      points
    },
    {
      id: 'match-f-1',
      label: 'Match 1',
      measure,
      points: [{ x: 0, value: 30 }]
    }
  ]);
  assert.equal(data.series[0].points.length, 12);
  assert.equal(data.series[0].points[0].x, -5);
  assert.equal(data.series[0].points[11].x, 6);
  assert.equal(points[0].x, 6);
  const frame = createSemanticFrame(
    { ...spec, kind: 'line' },
    ctx,
    result,
    data
  );
  assert.equal(Number.isFinite(Number(frame.series[0].points[0].label)), true);
  assert.throws(() =>
    lineData('number', [
      {
        id: 'bad',
        label: 'Bad',
        measure,
        points: [{ x: 'Match 1 @ 3s', value: 3 }]
      }
    ])
  );
});

test('timestamp series parse to numeric epoch milliseconds without category-label inference', () => {
  const data = lineData('timestamp', [
    {
      id: 'time',
      label: 'Time',
      measure,
      points: [{ x: ctx.asOfUtc, value: 1 }]
    }
  ]);
  assert.equal(data.series[0].points[0].x, Date.parse(ctx.asOfUtc));
  assert.throws(() =>
    lineData('timestamp', [
      { id: 'time', label: 'Time', measure, points: [{ x: 'bad', value: 1 }] }
    ])
  );
});

test('histogram bins preserve all boundaries including unbounded overflow', () => {
  const bins = Array.from({ length: 10 }, (_, index) => ({
    id: `bin-${index}`,
    label: String(index),
    lower: index === 0 ? null : index,
    upper: index === 9 ? null : index + 1,
    value: 10 - index
  }));
  const data = histogramData(measure, bins);
  assert.deepEqual(data.bins, bins);
  assert.equal(data.bins.length, 10);
  assert.throws(() =>
    histogramData(measure, [
      { id: 'bad', label: 'Bad', lower: 2, upper: 1, value: 0 }
    ])
  );
});

test('explicit nested-array flattening retains text, source identities and authoritative ranks', () => {
  const rows = flattenTableRows(
    [{ teamKey: 7, names: ['Robot A', 'Robot B'] }],
    {
      parentId: (parent) => stableEntityId('team', parent.teamKey),
      path: 'names',
      children: (parent) => parent.names,
      row: (name, parent, index) => ({
        label: `Team ${parent.teamKey}`,
        rank: 7 + index,
        cells: { name }
      })
    }
  );
  const data = tableData(
    'ranking-table',
    [{ id: 'name', label: 'Robot', format: { style: 'text', scale: 1 } }],
    rows
  );
  assert.equal(data.rows[0].rank, 7);
  assert.equal(data.rows[1].rank, 8);
  assert.equal(data.rows[1].cells.name, 'Robot B');
  const frame = createSemanticFrame(
    { ...spec, kind: 'ranking-table' },
    ctx,
    result,
    data
  );
  assert.equal(frame.rows?.[0].__rank, 7);
  assert.equal(frame.rows?.[1].name, 'Robot B');
  assert.throws(() =>
    tableData(
      'ranking-table',
      [measure],
      [{ id: 't', label: 'T', cells: { score: 4 } }]
    )
  );
});

test('formats explicitly distinguish ratio and percent storage and text values', () => {
  assert.equal(formatSemanticCell(0.425, percentFormat('ratio')), '42.5%');
  assert.equal(formatSemanticCell(42.5, percentFormat('percent')), '42.5%');
  assert.equal(formatSemanticCell(0, numberFormat(0, 'points')), '0 points');
  assert.equal(formatSemanticCell(null, numberFormat()), '—');
  assert.equal(
    formatSemanticCell('Robot', { style: 'text', scale: 1 }),
    'Robot'
  );
});

test('source failure, legitimate empty output, and null observations remain different states', () => {
  assert.throws(
    () =>
      requireOkResult({
        status: 'unavailable',
        reason: 'No source',
        warnings: []
      }),
    /No source/
  );
  assert.throws(
    () => createSemanticFrame(spec, ctx, result, scalarData([])),
    /emptyReason/
  );
  const empty = createSemanticFrame(spec, ctx, result, scalarData([]), {
    emptyReason: 'No eligible matches'
  });
  assert.equal(empty.emptyReason, 'No eligible matches');
  const missing = createSemanticFrame(
    spec,
    ctx,
    result,
    scalarData([{ measure, value: null }])
  );
  assert.equal(missing.emptyReason, undefined);
  assert.equal(missing.series[0].points[0].value, null);
  assert.throws(() =>
    createSemanticFrame(
      { ...spec, bindings: { teamKey: 'team' } },
      ctx,
      result,
      scalarData([{ measure, value: 1 }])
    )
  );
});
