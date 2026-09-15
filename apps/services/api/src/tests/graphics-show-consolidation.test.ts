/**
 * Consolidation of the cue queue and the rundown onto one durable model
 * (Task 06). Covers the one-way `graphics_queue` -> producer-show migration,
 * its idempotency across restarts, the revision-aware write path that replaced
 * the whole-array queue PUT, and the deprecated read adapter that keeps
 * unmigrated consumers working until Task 16.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCER_SHOW_RUNDOWN_ID } from '@toa-lib/models';
import { graphicsFixture, sampleGraphic } from './graphics-test-support.js';
import { migrateGraphicsDatabase } from '../graphics/GraphicsSchema.js';

interface ShowDocument {
  rundownId: string;
  eventKey: string;
  revision: number;
  name: string;
  updatedAtUtc: string;
  entries: {
    entryId: string;
    timelineId: string;
    values?: Record<string, number>;
    note?: string;
  }[];
}

/** An old event database, before the queue was ever consolidated: real `graphics_queue` JSON and no migration marker. */
async function seedLegacyQueue(
  withDatabase: (
    eventKey: string,
    work: (db: {
      exec: (sql: string) => Promise<unknown>;
      run: (sql: string, params?: unknown[]) => Promise<unknown>;
      all: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
    }) => Promise<unknown>
  ) => Promise<unknown>,
  eventKey: string,
  entries: unknown,
  updatedAtUtc = '2026-09-13T22:15:00.000Z'
) {
  await withDatabase(eventKey, async (db) => {
    // Only the pre-Task-06 tables, written by hand: running the current
    // migration here would apply the consolidation before the test starts.
    await db.exec(`
      CREATE TABLE IF NOT EXISTS graphics_queue (
        eventKey TEXT PRIMARY KEY, data TEXT NOT NULL, updatedAtUtc TEXT);
    `);
    await db.run(
      'INSERT INTO graphics_queue(eventKey,data,updatedAtUtc) VALUES (?,?,?)',
      [
        eventKey,
        typeof entries === 'string' ? entries : JSON.stringify(entries),
        updatedAtUtc
      ]
    );
  });
}

const createTimeline = (
  app: { inject: (o: unknown) => Promise<{ statusCode: number }> },
  eventKey: string,
  timelineId: string,
  extra: Record<string, unknown> = {}
) =>
  app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/timelines`,
    payload: {
      timelineId,
      eventKey,
      name: `Timeline ${timelineId}`,
      items: [sampleGraphic(`${timelineId}-spec`)],
      ...extra
    }
  });

const getShow = async (
  app: { inject: (o: unknown) => Promise<{ statusCode: number; json: () => unknown }> },
  eventKey: string
): Promise<ShowDocument> => {
  const res = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/show`
  });
  assert.equal(res.statusCode, 200);
  return res.json() as ShowDocument;
};

const patchShow = (
  app: { inject: (o: unknown) => Promise<{ statusCode: number; json: () => unknown }> },
  eventKey: string,
  entries: unknown[],
  expectedRevision: number
) =>
  app.inject({
    method: 'PATCH',
    url: `/graphics/${eventKey}/rundowns/${PRODUCER_SHOW_RUNDOWN_ID}`,
    payload: { entries, expectedRevision }
  });

test('show: an event with no legacy queue and no rundown gets an empty producer show on first read', async (t) => {
  const { app } = await graphicsFixture(t);
  const show = await getShow(app, 'event-a');
  assert.equal(show.rundownId, PRODUCER_SHOW_RUNDOWN_ID);
  assert.equal(show.eventKey, 'event-a');
  assert.equal(show.revision, 0);
  assert.deepEqual(show.entries, []);
});

test('show: the ensure-on-read create is idempotent - a second read does not bump the revision or duplicate the row', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const first = await getShow(app, 'event-a');
  const second = await getShow(app, 'event-a');
  assert.equal(second.revision, first.revision);
  assert.equal(second.updatedAtUtc, first.updatedAtUtc);
  const rows = await withDatabase('event-a', (db) =>
    db.all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM graphics_rundown WHERE rundownId=?',
      [PRODUCER_SHOW_RUNDOWN_ID]
    )
  );
  assert.equal(rows[0].n, 1);
});

test('migration: a populated legacy queue becomes the producer show with order, ids, timeline ids and values intact', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, [
    {
      entryId: 'entry-1',
      timelineId: 'timeline-a',
      values: { featured: 1114 },
      note: 'Blue spotlight'
    },
    { entryId: 'entry-2', timelineId: 'timeline-b', values: {} },
    { entryId: 'entry-3', timelineId: 'timeline-a', values: { featured: 254 } }
  ]);

  const show = await getShow(app, eventKey);
  assert.equal(show.revision, 0);
  assert.deepEqual(
    show.entries.map((e) => e.entryId),
    ['entry-1', 'entry-2', 'entry-3']
  );
  assert.deepEqual(
    show.entries.map((e) => e.timelineId),
    ['timeline-a', 'timeline-b', 'timeline-a']
  );
  assert.deepEqual(show.entries[0].values, { featured: 1114 });
  assert.equal(show.entries[0].note, 'Blue spotlight');
  // An empty legacy values map is omitted, not stored as `{}`.
  assert.equal(show.entries[1].values, undefined);
  assert.deepEqual(show.entries[2].values, { featured: 254 });
  // The operator's own last-touched time is preserved, not migration time.
  assert.equal(show.updatedAtUtc, '2026-09-13T22:15:00.000Z');
});

test('migration: the legacy queue row is preserved on disk, so the pre-migration order stays recoverable', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  const legacy = [
    { entryId: 'entry-1', timelineId: 'timeline-a', values: {} },
    { entryId: 'entry-2', timelineId: 'timeline-b', values: {} }
  ];
  await seedLegacyQueue(withDatabase, eventKey, legacy);
  await getShow(app, eventKey);

  const rows = await withDatabase(eventKey, (db) =>
    db.all<{ data: string }>('SELECT data FROM graphics_queue WHERE eventKey=?', [
      eventKey
    ])
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(JSON.parse(rows[0].data), legacy);
});

test('migration: restarting cannot duplicate entries, and never resurrects ones the producer removed after migrating', async (t) => {
  const { app, repository, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, [
    { entryId: 'entry-1', timelineId: 'timeline-a', values: {} },
    { entryId: 'entry-2', timelineId: 'timeline-b', values: {} }
  ]);

  const migrated = await getShow(app, eventKey);
  assert.equal(migrated.entries.length, 2);

  // Producer removes one entry post-migration.
  const removed = await patchShow(
    app,
    eventKey,
    [migrated.entries[1]],
    migrated.revision
  );
  assert.equal(removed.statusCode, 200);

  // Every later transaction re-runs `migrateGraphicsDatabase`; the marker is
  // what stops it re-importing the untouched legacy row. Several passes,
  // including a fresh repository standing in for a service restart.
  await repository.listTimelines(eventKey);
  await withDatabase(eventKey, (db) => migrateGraphicsDatabase(db));
  const after = await getShow(app, eventKey);
  assert.deepEqual(
    after.entries.map((e) => e.entryId),
    ['entry-2']
  );
  assert.equal(after.revision, 1);

  const markers = await withDatabase(eventKey, (db) =>
    db.all<{ n: number }>('SELECT COUNT(*) AS n FROM graphics_migration')
  );
  assert.equal(markers[0].n, 1);
});

test('migration: duplicate legacy entry ids are suffixed rather than dropped', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, [
    { entryId: 'dup', timelineId: 'timeline-a', values: { featured: 1 } },
    { entryId: 'dup', timelineId: 'timeline-b', values: { featured: 2 } }
  ]);

  const show = await getShow(app, eventKey);
  assert.deepEqual(
    show.entries.map((e) => e.entryId),
    ['dup', 'dup-2']
  );
  assert.deepEqual(
    show.entries.map((e) => e.timelineId),
    ['timeline-a', 'timeline-b']
  );
});

test('migration: an empty legacy queue migrates to an empty show and still records the marker', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, []);

  const show = await getShow(app, eventKey);
  assert.deepEqual(show.entries, []);
  const markers = await withDatabase(eventKey, (db) =>
    db.all<{ n: number }>('SELECT COUNT(*) AS n FROM graphics_migration')
  );
  assert.equal(markers[0].n, 1);
});

test('migration: a corrupt legacy queue row is preserved and skipped, never taking graphics offline', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, '{not valid json');

  // Reads still succeed - a broken legacy row must not fail the schema
  // migration that runs at the top of every graphics transaction.
  const show = await getShow(app, eventKey);
  assert.deepEqual(show.entries, []);
  const list = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  assert.equal(list.statusCode, 200);

  const rows = await withDatabase(eventKey, (db) =>
    db.all<{ data: string }>('SELECT data FROM graphics_queue WHERE eventKey=?', [
      eventKey
    ])
  );
  assert.equal(rows[0].data, '{not valid json');
});

test('migration: an existing producer-show rundown is never overwritten by a legacy queue row', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  // The show already exists (created by an earlier read) and holds live order.
  const existing = await getShow(app, eventKey);
  await patchShow(
    app,
    eventKey,
    [{ entryId: 'live-entry', timelineId: 'timeline-live' }],
    existing.revision
  );
  // A legacy row shows up afterwards (e.g. a restored older database file)
  // together with a cleared marker, so the migration genuinely re-runs.
  await withDatabase(eventKey, async (db) => {
    await db.run(
      'INSERT INTO graphics_queue(eventKey,data,updatedAtUtc) VALUES (?,?,?)',
      [
        eventKey,
        JSON.stringify([
          { entryId: 'stale-entry', timelineId: 'timeline-old', values: {} }
        ]),
        '2026-09-01T00:00:00.000Z'
      ]
    );
    await db.run('DELETE FROM graphics_migration');
  });

  const after = await getShow(app, eventKey);
  assert.deepEqual(
    after.entries.map((e) => e.entryId),
    ['live-entry']
  );
});

test('migration: two events in one fixture migrate independently and never leak entries into each other', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  await seedLegacyQueue(withDatabase, 'event-a', [
    { entryId: 'a-1', timelineId: 'timeline-a', values: {} }
  ]);
  await seedLegacyQueue(withDatabase, 'event-b', [
    { entryId: 'b-1', timelineId: 'timeline-b', values: {} },
    { entryId: 'b-2', timelineId: 'timeline-b', values: {} }
  ]);

  const a = await getShow(app, 'event-a');
  const b = await getShow(app, 'event-b');
  assert.deepEqual(
    a.entries.map((e) => e.entryId),
    ['a-1']
  );
  assert.deepEqual(
    b.entries.map((e) => e.entryId),
    ['b-1', 'b-2']
  );
  assert.equal(a.eventKey, 'event-a');
  assert.equal(b.eventKey, 'event-b');
});

test('writes: a reorder and a removal commit against the current revision and bump it each time', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';
  const base = await getShow(app, eventKey);
  const entries = [
    { entryId: 'e1', timelineId: 'timeline-a' },
    { entryId: 'e2', timelineId: 'timeline-b' },
    { entryId: 'e3', timelineId: 'timeline-c' }
  ];
  const added = await patchShow(app, eventKey, entries, base.revision);
  assert.equal(added.statusCode, 200);
  assert.equal((added.json() as ShowDocument).revision, base.revision + 1);

  const reordered = await patchShow(
    app,
    eventKey,
    [entries[2], entries[0], entries[1]],
    base.revision + 1
  );
  assert.equal(reordered.statusCode, 200);
  assert.deepEqual(
    (reordered.json() as ShowDocument).entries.map((e) => e.entryId),
    ['e3', 'e1', 'e2']
  );

  const removed = await patchShow(
    app,
    eventKey,
    [entries[2], entries[1]],
    base.revision + 2
  );
  assert.equal(removed.statusCode, 200);
  const final = removed.json() as ShowDocument;
  assert.deepEqual(
    final.entries.map((e) => e.entryId),
    ['e3', 'e2']
  );
  assert.equal(final.revision, base.revision + 3);
});

test('writes: a stale full-array write loses, so a concurrent removal cannot be resurrected', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';
  const base = await getShow(app, eventKey);
  const both = [
    { entryId: 'e1', timelineId: 'timeline-a' },
    { entryId: 'e2', timelineId: 'timeline-b' }
  ];
  await patchShow(app, eventKey, both, base.revision);
  const loaded = await getShow(app, eventKey);

  // Producer A removes e1.
  const removal = await patchShow(app, eventKey, [both[1]], loaded.revision);
  assert.equal(removal.statusCode, 200);

  // Producer B, still holding the pre-removal render, replays the whole
  // array. The old `PUT /queue` would have brought e1 back.
  const stale = await patchShow(app, eventKey, both, loaded.revision);
  assert.equal(stale.statusCode, 409);
  assert.equal((stale.json() as { code: string }).code, 'CONFLICT');

  const after = await getShow(app, eventKey);
  assert.deepEqual(
    after.entries.map((e) => e.entryId),
    ['e2']
  );
});

test('writes: duplicate entry ids in one write are rejected', async (t) => {
  const { app } = await graphicsFixture(t);
  const base = await getShow(app, 'event-a');
  const res = await patchShow(
    app,
    'event-a',
    [
      { entryId: 'same', timelineId: 'timeline-a' },
      { entryId: 'same', timelineId: 'timeline-b' }
    ],
    base.revision
  );
  assert.equal(res.statusCode, 400);
});

test('writes: an entry whose timeline was deleted stays editable - order is never discarded to satisfy a dangling reference', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await createTimeline(app, eventKey, 'timeline-a');
  await createTimeline(app, eventKey, 'timeline-doomed');
  const base = await getShow(app, eventKey);
  const entries = [
    { entryId: 'e1', timelineId: 'timeline-a' },
    { entryId: 'e2', timelineId: 'timeline-doomed' },
    { entryId: 'e3', timelineId: 'timeline-a' }
  ];
  await patchShow(app, eventKey, entries, base.revision);

  const deleted = await app.inject({
    method: 'DELETE',
    url: `/graphics/${eventKey}/timelines/timeline-doomed?expectedRevision=0`
  });
  assert.equal(deleted.statusCode, 200);

  // The dangling entry survives the delete in place ...
  const dangling = await getShow(app, eventKey);
  assert.deepEqual(
    dangling.entries.map((e) => e.entryId),
    ['e1', 'e2', 'e3']
  );
  // ... and the producer can still reorder around it and then remove it.
  const reordered = await patchShow(
    app,
    eventKey,
    [entries[2], entries[1], entries[0]],
    dangling.revision
  );
  assert.equal(reordered.statusCode, 200);
  const cleaned = await patchShow(
    app,
    eventKey,
    [entries[2], entries[0]],
    dangling.revision + 1
  );
  assert.equal(cleaned.statusCode, 200);
  assert.deepEqual(
    (cleaned.json() as ShowDocument).entries.map((e) => e.entryId),
    ['e3', 'e1']
  );
});

test('writes: two events keep separate shows', async (t) => {
  const { app } = await graphicsFixture(t);
  const a = await getShow(app, 'event-a');
  await patchShow(
    app,
    'event-a',
    [{ entryId: 'a-only', timelineId: 'timeline-a' }],
    a.revision
  );
  const b = await getShow(app, 'event-b');
  assert.deepEqual(b.entries, []);
  assert.equal(b.revision, 0);
});

test('legacy read adapter: GET /queue projects the producer show and there is no PUT left to write through', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, [
    { entryId: 'entry-1', timelineId: 'timeline-a', values: { featured: 7 } },
    { entryId: 'entry-2', timelineId: 'timeline-b', values: {}, note: 'n' }
  ]);

  const res = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/queue`
  });
  assert.equal(res.statusCode, 200);
  const queue = res.json() as {
    eventKey: string;
    entries: { entryId: string; values: Record<string, number> }[];
    updatedAtUtc: string;
  };
  assert.equal(queue.eventKey, eventKey);
  assert.deepEqual(
    queue.entries.map((e) => e.entryId),
    ['entry-1', 'entry-2']
  );
  // The queue shape always carries a values map, even where the rundown omits it.
  assert.deepEqual(queue.entries[0].values, { featured: 7 });
  assert.deepEqual(queue.entries[1].values, {});

  const write = await app.inject({
    method: 'PUT',
    url: `/graphics/${eventKey}/queue`,
    payload: { entries: [] }
  });
  assert.equal(write.statusCode, 404);
});

test('legacy read adapter: the projection tracks later rundown writes rather than the stale queue row', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';
  await seedLegacyQueue(withDatabase, eventKey, [
    { entryId: 'entry-1', timelineId: 'timeline-a', values: {} }
  ]);
  const show = await getShow(app, eventKey);
  await patchShow(
    app,
    eventKey,
    [
      ...show.entries,
      { entryId: 'entry-2', timelineId: 'timeline-b', values: { x: 1 } }
    ],
    show.revision
  );

  const res = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/queue`
  });
  const queue = res.json() as { entries: { entryId: string }[] };
  assert.deepEqual(
    queue.entries.map((e) => e.entryId),
    ['entry-1', 'entry-2']
  );
});
