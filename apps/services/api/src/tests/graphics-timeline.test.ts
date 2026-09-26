import test from 'node:test';
import assert from 'node:assert/strict';
import { graphicsFixture } from './graphics-test-support.js';
import { migrateGraphicsDatabase } from '../graphics/GraphicsSchema.js';

function sampleSpec(id: string) {
  return {
    id,
    title: 'Top Scoring Teams',
    stat: 'top-scoring-teams',
    selectors: {},
    filters: {},
    params: {},
    kind: 'ranking-table' as const,
    mode: 'fullscreen' as const,
    options: {}
  };
}

test('graphics timelines: create -> list -> patch -> delete round-trip', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const timelineId = 'timeline-1';

  // Create
  const createRes = await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/timelines`,
    payload: {
      timelineId,
      eventKey,
      name: 'Show Open',
      description: 'Opening graphics package',
      items: [sampleSpec('spec-1')]
    }
  });
  assert.equal(createRes.statusCode, 200);
  const created = createRes.json() as {
    updatedAtUtc: string;
    items: unknown[];
  };
  assert.ok(created.updatedAtUtc.length > 0);
  assert.equal(created.items.length, 1);

  // List
  const listRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  assert.equal(listRes.statusCode, 200);
  const list = listRes.json() as { timelineId: string; name: string }[];
  assert.equal(list.length, 1);
  assert.equal(list[0].timelineId, timelineId);
  assert.equal(list[0].name, 'Show Open');

  // Patch
  const patchRes = await app.inject({
    method: 'PATCH',
    url: `/graphics/${eventKey}/timelines/${timelineId}`,
    payload: {
      name: 'Show Open (Updated)',
      items: [sampleSpec('spec-1'), sampleSpec('spec-2')],
      sortOrder: 5,
      expectedRevision: 0
    }
  });
  assert.equal(patchRes.statusCode, 200);
  const patched = patchRes.json() as {
    name: string;
    items: unknown[];
    description?: string;
  };
  assert.equal(patched.name, 'Show Open (Updated)');
  assert.equal(patched.items.length, 2);
  // description was not sent in the patch, so it should be preserved
  assert.equal(patched.description, 'Opening graphics package');

  const listAfterPatch = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  const listedAfterPatch = listAfterPatch.json() as {
    name: string;
    items: unknown[];
  }[];
  assert.equal(listedAfterPatch[0].name, 'Show Open (Updated)');
  assert.equal(listedAfterPatch[0].items.length, 2);

  // Delete
  const deleteRes = await app.inject({
    method: 'DELETE',
    url: `/graphics/${eventKey}/timelines/${timelineId}?expectedRevision=1`
  });
  assert.equal(deleteRes.statusCode, 200);

  const listAfterDelete = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  assert.equal((listAfterDelete.json() as unknown[]).length, 0);
});

test('graphics timelines: ?published filters the list, and defaults to unpublished until patched', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';

  // Created with no `published` field at all - same as a pre-existing
  // client that has never heard of the flag.
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/timelines`,
    payload: { timelineId: 'unpublished-1', eventKey, name: 'Draft', items: [] }
  });
  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/timelines`,
    payload: {
      timelineId: 'published-1',
      eventKey,
      name: 'Live Ready',
      items: [],
      published: true
    }
  });

  const unfiltered = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  assert.equal(unfiltered.statusCode, 200);
  assert.equal((unfiltered.json() as unknown[]).length, 2);

  const publishedOnly = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines?published=true`
  });
  assert.equal(publishedOnly.statusCode, 200);
  const publishedList = publishedOnly.json() as { timelineId: string }[];
  assert.equal(publishedList.length, 1);
  assert.equal(publishedList[0].timelineId, 'published-1');

  const unpublishedOnly = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines?published=false`
  });
  assert.equal(unpublishedOnly.statusCode, 200);
  const unpublishedList = unpublishedOnly.json() as { timelineId: string }[];
  assert.equal(unpublishedList.length, 1);
  assert.equal(unpublishedList[0].timelineId, 'unpublished-1');

  // Publishing via PATCH moves it into the `?published=true` result.
  const patchRes = await app.inject({
    method: 'PATCH',
    url: `/graphics/${eventKey}/timelines/unpublished-1`,
    payload: { published: true, expectedRevision: 0 }
  });
  assert.equal(patchRes.statusCode, 200);
  assert.equal((patchRes.json() as { published: boolean }).published, true);

  const publishedAfterPatch = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines?published=true`
  });
  assert.equal((publishedAfterPatch.json() as unknown[]).length, 2);

  const invalidQuery = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines?published=nope`
  });
  assert.equal(invalidQuery.statusCode, 400);
});

test('graphics timelines: 404 on missing timelineId for patch and delete', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const patchRes = await app.inject({
    method: 'PATCH',
    url: `/graphics/${eventKey}/timelines/does-not-exist`,
    payload: { name: 'Nope', expectedRevision: 0 }
  });
  assert.equal(patchRes.statusCode, 404);
  const patchBody = patchRes.json() as {
    error: string;
    code: string;
    message: string;
  };
  assert.equal(patchBody.error, 'NOT_FOUND');
  assert.equal(patchBody.code, 'NOT_FOUND');
  assert.ok(patchBody.message.length > 0);

  const deleteRes = await app.inject({
    method: 'DELETE',
    url: `/graphics/${eventKey}/timelines/does-not-exist?expectedRevision=0`
  });
  assert.equal(deleteRes.statusCode, 404);
  const deleteBody = deleteRes.json() as {
    error: string;
    code: string;
    message: string;
  };
  assert.equal(deleteBody.error, 'NOT_FOUND');
  assert.equal(deleteBody.code, 'NOT_FOUND');
  assert.ok(deleteBody.message.length > 0);
});

test('graphics timelines: a request missing expectedRevision is a structured 400, not an opaque 500', async (t) => {
  const { app } = await graphicsFixture(t);
  const eventKey = 'event-a';
  const timelineId = 'timeline-1';

  await app.inject({
    method: 'POST',
    url: `/graphics/${eventKey}/timelines`,
    payload: { timelineId, eventKey, name: 'Show Open', items: [] }
  });

  // DELETE with no `expectedRevision` query param - a request-schema failure.
  // Without the controller's own error handler this serializes against the
  // route's `errorSchema` response, fails (no `retryable`), and Fastify
  // returns FST_ERR_FAILED_ERROR_SERIALIZATION as a 500.
  const deleteRes = await app.inject({
    method: 'DELETE',
    url: `/graphics/${eventKey}/timelines/${timelineId}`
  });
  assert.equal(deleteRes.statusCode, 400);
  const deleteBody = deleteRes.json() as { code: string; retryable: boolean };
  assert.equal(deleteBody.code, 'INVALID_INPUT');
  assert.equal(deleteBody.retryable, false);

  // Same for a PATCH body with no `expectedRevision`.
  const patchRes = await app.inject({
    method: 'PATCH',
    url: `/graphics/${eventKey}/timelines/${timelineId}`,
    payload: { name: 'Renamed' }
  });
  assert.equal(patchRes.statusCode, 400);
  assert.equal((patchRes.json() as { code: string }).code, 'INVALID_INPUT');
});

test('graphics timelines: a corrupt data row degrades to items: [] instead of throwing', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const timelineId = 'corrupt-timeline';

  // Insert a row whose `data` column is not valid GraphicSpec[] JSON, bypassing
  // the controller entirely (this is standing in for a row written by an older
  // client version, or corrupted on disk).
  await withDatabase(eventKey, async (db) => {
    await migrateGraphicsDatabase(db);
    await db.run(
      `INSERT INTO graphics_timeline(timelineId,eventKey,name,description,data,sortOrder,updatedAtUtc)
       VALUES(?,?,?,?,?,?,?)`,
      [
        timelineId,
        eventKey,
        'Corrupt Row',
        null,
        '{not valid json',
        0,
        new Date().toISOString()
      ]
    );

    // A second row with valid data, to prove the corrupt row does not take the
    // whole list response down with it.
    await db.run(
      `INSERT INTO graphics_timeline(timelineId,eventKey,name,description,data,sortOrder,updatedAtUtc)
       VALUES(?,?,?,?,?,?,?)`,
      [
        'healthy-timeline',
        eventKey,
        'Healthy Row',
        null,
        JSON.stringify([sampleSpec('spec-1')]),
        1,
        new Date().toISOString()
      ]
    );
  });

  const listRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  assert.equal(listRes.statusCode, 200);
  const list = listRes.json() as { timelineId: string; items: unknown[] }[];
  assert.equal(list.length, 2);

  const corrupt = list.find((t) => t.timelineId === timelineId);
  assert.ok(corrupt);
  assert.deepEqual(corrupt!.items, []);

  const healthy = list.find((t) => t.timelineId === 'healthy-timeline');
  assert.ok(healthy);
  assert.equal(healthy!.items.length, 1);
});

test('graphics timelines: a corrupt data row (valid JSON, wrong shape) also degrades to items: []', async (t) => {
  const { app, withDatabase } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const timelineId = 'bad-shape-timeline';
  await withDatabase(eventKey, async (db) => {
    await migrateGraphicsDatabase(db);
    await db.run(
      `INSERT INTO graphics_timeline(timelineId,eventKey,name,description,data,sortOrder,updatedAtUtc)
       VALUES(?,?,?,?,?,?,?)`,
      [
        timelineId,
        eventKey,
        'Bad Shape Row',
        null,
        // Valid JSON, but not an array of GraphicSpec - missing required fields.
        JSON.stringify([{ foo: 'bar' }]),
        0,
        new Date().toISOString()
      ]
    );
  });

  const listRes = await app.inject({
    method: 'GET',
    url: `/graphics/${eventKey}/timelines`
  });
  assert.equal(listRes.statusCode, 200);
  const list = listRes.json() as { timelineId: string; items: unknown[] }[];
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].items, []);
});
