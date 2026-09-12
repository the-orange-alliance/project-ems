import test from 'node:test';
import assert from 'node:assert/strict';
import { graphicsFixture } from './graphics-test-support.js';
import { migrateGraphicsDatabase } from '../graphics/GraphicsSchema.js';

test('graphics queue: GET on an event with no row returns an empty queue, not a 404', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const getRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/queue`
  });
  assert.equal(getRes.statusCode, 200);
  const queue = getRes.json() as {
    eventKey: string;
    entries: unknown[];
    updatedAtUtc: string;
  };
  assert.equal(queue.eventKey, eventKey);
  assert.deepEqual(queue.entries, []);
  assert.ok(queue.updatedAtUtc.length > 0);
});

test('graphics queue: PUT then GET round-trips entries including their values map', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const entries = [
    {
      entryId: 'entry-1',
      timelineId: 'timeline-1',
      values: { teamNumber: 1114, score: 42 },
      note: 'Blue alliance spotlight'
    },
    {
      entryId: 'entry-2',
      timelineId: 'timeline-2',
      values: {}
    }
  ];

  const putRes = await app.inject({
    method: 'PUT',
    url: `/graphics/${eventKey}/queue`,
    payload: { entries }
  });
  assert.equal(putRes.statusCode, 200);
  const putBody = putRes.json() as {
    eventKey: string;
    entries: typeof entries;
    updatedAtUtc: string;
  };
  assert.equal(putBody.eventKey, eventKey);
  assert.equal(putBody.entries.length, 2);
  assert.deepEqual(putBody.entries, entries);
  assert.ok(putBody.updatedAtUtc.length > 0);

  const getRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/queue`
  });
  assert.equal(getRes.statusCode, 200);
  const getBody = getRes.json() as {
    eventKey: string;
    entries: typeof entries;
    updatedAtUtc: string;
  };
  assert.equal(getBody.eventKey, eventKey);
  assert.deepEqual(getBody.entries, entries);
  assert.equal(getBody.updatedAtUtc, putBody.updatedAtUtc);
});

test('graphics queue: a row whose data is syntactically invalid JSON degrades to entries: []', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';

  // Seed the schema (normally created lazily by the repository's own
  // migration) and write a row with corrupted `data`, bypassing the
  // controller entirely - standing in for a row written by an older client
  // version, or corrupted on disk.
  await withDatabase(eventKey, async (db) => {
    await migrateGraphicsDatabase(db);
    await db.run(
      'INSERT INTO graphics_queue(eventKey,data,updatedAtUtc) VALUES (?,?,?)',
      [eventKey, '{not valid json', new Date().toISOString()]
    );
  });

  const getRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/queue`
  });
  assert.equal(getRes.statusCode, 200);
  const queue = getRes.json() as { eventKey: string; entries: unknown[] };
  assert.equal(queue.eventKey, eventKey);
  assert.deepEqual(queue.entries, []);
});

test('graphics queue: a row whose data is valid JSON but the wrong shape also degrades to entries: []', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';

  await withDatabase(eventKey, async (db) => {
    await migrateGraphicsDatabase(db);
    await db.run(
      'INSERT INTO graphics_queue(eventKey,data,updatedAtUtc) VALUES (?,?,?)',
      [
        eventKey,
        // Valid JSON, but not an array of QueueEntry - missing required fields.
        JSON.stringify([{ foo: 'bar' }]),
        new Date().toISOString()
      ]
    );
  });

  const getRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/queue`
  });
  assert.equal(getRes.statusCode, 200);
  const queue = getRes.json() as { eventKey: string; entries: unknown[] };
  assert.equal(queue.eventKey, eventKey);
  assert.deepEqual(queue.entries, []);
});
