import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { AsyncDatabase } from 'promised-sqlite3';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { Match, WebhookEvent } from '@toa-lib/models';
import { EventDatabase, getDB } from '../db/EventDatabase.js';
import webhooksController from '../controllers/Webhooks.js';
import { EmitWebhooks } from '../util/Webhooks.js';

test('webhook outcome subscriptions and API compatibility', async (t) => {
  // Replace only database initialization: filtering uses real SQLite queries,
  // and HTTP delivery uses a local receiver. No operator databases are opened.
  const databases: AsyncDatabase[] = [];
  t.mock.method(
    EventDatabase.prototype,
    'initDatabase',
    async function (this: EventDatabase) {
      this.db = await AsyncDatabase.open(':memory:');
      databases.push(this.db);
    }
  );
  t.after(async () => {
    for (const db of databases) await db.close();
  });
  const globalDb = await getDB('global');
  await globalDb.db.exec(await globalDb.getQueryFromFile('create_global.sql'));
  const eventDb = await getDB('webhook-test');
  await eventDb.db.exec(`CREATE TABLE match (
    eventKey TEXT, tournamentKey TEXT, id INTEGER, fieldNumber INTEGER,
    name TEXT, redScore INTEGER, blueScore INTEGER
  );
  INSERT INTO match VALUES ('webhook-test', 'qual', 1, 2, 'Persisted match', 0, 0);`);

  const deliveries: {
    path: string;
    body: { event: WebhookEvent; payload: Match<any> };
  }[] = [];
  const receiver = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk.toString();
    deliveries.push({ path: request.url!, body: JSON.parse(body) });
    response.writeHead(200).end();
  });
  receiver.listen(0, '127.0.0.1');
  await once(receiver, 'listening');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        receiver.close((error) => (error ? reject(error) : resolve()));
      })
  );
  const baseUrl = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(webhooksController, { prefix: '/webhooks' });
  t.after(() => app.close());

  const match: Match<any> = {
    eventKey: 'webhook-test',
    tournamentKey: 'qual',
    id: 1,
    name: 'Client match',
    scheduledTime: '',
    prestartTime: '',
    actualStartTime: '',
    cycleTime: 0,
    fieldNumber: 1,
    active: 0,
    uploaded: 0,
    updatedAtUtc: '',
    redScore: 120,
    blueScore: 98,
    redMinPen: 0,
    redMajPen: 0,
    blueMinPen: 0,
    blueMajPen: 0,
    result: -1,
    participants: []
  };
  const families = [
    {
      event: WebhookEvent.COMMITTED,
      variants: [
        WebhookEvent.COMMITTED_RED,
        WebhookEvent.COMMITTED_BLUE,
        WebhookEvent.COMMITTED_TIED
      ]
    },
    {
      event: WebhookEvent.SCORES_POSTED,
      variants: [
        WebhookEvent.SCORES_POSTED_RED,
        WebhookEvent.SCORES_POSTED_BLUE,
        WebhookEvent.SCORES_POSTED_TIED
      ]
    }
  ];
  for (const family of families) {
    for (const subscribedEvent of [family.event, ...family.variants]) {
      await globalDb.insertValue('webhooks', [
        {
          url: `${baseUrl}/${subscribedEvent}`,
          enabled: 1,
          subscribedEvent,
          field: null
        }
      ]);
    }
    for (const [suffix, enabled, field] of [
      ['disabled', 0, null],
      ['wrong-field', 1, 3],
      ['matching-field', 1, 2]
    ] as const) {
      await globalDb.insertValue('webhooks', [
        {
          url: `${baseUrl}/${family.event}/${suffix}`,
          enabled,
          subscribedEvent: family.event,
          field
        }
      ]);
    }
    for (const [index, scores] of [
      [120, 98],
      [98, 120],
      [98, 98]
    ].entries()) {
      await t.test(`${family.event}: ${family.variants[index]}`, async () => {
        deliveries.length = 0;
        await EmitWebhooks(family.event, {
          ...match,
          redScore: scores[0],
          blueScore: scores[1]
        });
        assert.deepEqual(
          deliveries.map((entry) => entry.path).sort(),
          [
            `/${family.event}`,
            `/${family.variants[index]}`,
            `/${family.event}/matching-field`
          ].sort()
        );
        for (const { body } of deliveries) {
          assert.equal(body.event, family.event);
          assert.equal(body.payload.redScore, scores[0]);
          assert.equal(body.payload.blueScore, scores[1]);
          assert.equal(body.payload.result, -1); // Outcome uses scores, not result.
          assert.equal(body.payload.fieldNumber, 2); // Persisted field controls filtering.
          assert.equal(body.payload.name, 'Persisted match');
        }
      });
    }
  }

  await t.test('unrelated events remain exact subscriptions', async () => {
    await globalDb.insertValue('webhooks', [
      {
        url: `${baseUrl}/prestart`,
        enabled: 1,
        subscribedEvent: WebhookEvent.PRESTARTED,
        field: null
      }
    ]);
    deliveries.length = 0;
    await EmitWebhooks(WebhookEvent.PRESTARTED, match);
    assert.deepEqual(
      deliveries.map((entry) => entry.path),
      ['/prestart']
    );
    assert.equal(deliveries[0].body.event, WebhookEvent.PRESTARTED);
  });

  await t.test(
    'unknown fields only deliver to all-field subscribers',
    async () => {
      await eventDb.db.exec('UPDATE match SET fieldNumber = NULL');
      deliveries.length = 0;
      await EmitWebhooks(WebhookEvent.COMMITTED, match);
      assert.deepEqual(deliveries.map((entry) => entry.path).sort(), [
        '/COMMITTED',
        '/COMMITTED_RED'
      ]);
    }
  );

  await t.test(
    'new subscriptions can be saved, listed, and tested through the API',
    async () => {
      for (const subscribedEvent of families[0].variants) {
        const url = `${baseUrl}/api/${subscribedEvent}`;
        const saved = await app.inject({
          method: 'PUT',
          url: '/webhooks/',
          payload: {
            url,
            enabled: true,
            subscribedEvent,
            field: null
          }
        });
        assert.equal(saved.statusCode, 200, saved.body);
        const listed = await app.inject({ method: 'GET', url: '/webhooks/' });
        assert.equal(listed.statusCode, 200, listed.body);
        assert.ok(
          listed
            .json()
            .some(
              (row: { url: string; subscribedEvent: string }) =>
                row.url === url && row.subscribedEvent === subscribedEvent
            )
        );
        deliveries.length = 0;
        const tested = await app.inject({
          method: 'POST',
          url: '/webhooks/test',
          payload: {
            url,
            event: subscribedEvent
          }
        });
        assert.equal(tested.statusCode, 200, tested.body);
        assert.equal(tested.json().success, true);
        assert.equal(deliveries.length, 1);
        assert.equal(deliveries[0].body.event, subscribedEvent);
      }
    }
  );
});
