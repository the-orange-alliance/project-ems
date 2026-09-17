import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { rm } from 'node:fs/promises';
import { sep } from 'node:path';
import matchController from '../controllers/Match.js';
import { getDB } from '../db/EventDatabase.js';
import { getAppData } from '@toa-lib/server';

test('match history revisions are monotonic and immutable', async () => {
  const eventKey = `fgc-history-${Date.now()}`;
  const tournamentKey = 'history-test';
  const id = 1;

  const db = await getDB(eventKey);
  await db.createEventBase();
  await db.createEventGameSpecifics('fgc_2026');

  await db.insertValue('tournament', [
    {
      eventKey,
      tournamentKey,
      tournamentLevel: 2,
      tournamentType: 'qualification',
      fieldCount: 1,
      fields: '1',
      name: 'History Test Tournament'
    }
  ]);

  await db.insertValue('match', [
    {
      eventKey,
      tournamentKey,
      id,
      name: 'Q1',
      scheduledTime: '',
      actualStartTime: '',
      prestartTime: '',
      fieldNumber: 1,
      cycleTime: 0,
      redScore: 0,
      redMinPen: 0,
      redMajPen: 0,
      blueScore: 0,
      blueMinPen: 0,
      blueMajPen: 0,
      active: 0,
      result: -1,
      uploaded: 0,
      updatedAtUtc: new Date().toISOString()
    }
  ]);

  await db.insertValue('match_detail', [
    {
      eventKey,
      tournamentKey,
      id
    }
  ]);

  await db.insertValue('match_participant', [
    {
      eventKey,
      tournamentKey,
      id,
      station: 10,
      teamKey: 1001,
      disqualified: 0,
      cardStatus: 0,
      surrogate: 0,
      noShow: 0
    }
  ]);

  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(matchController, { prefix: '/match' });

  const patchMatch = await app.inject({
    method: 'PATCH',
    url: `/match/${eventKey}/${tournamentKey}/${id}`,
    payload: {
      eventKey,
      tournamentKey,
      id,
      name: 'Q1 Updated',
      scheduledTime: '',
      actualStartTime: '',
      prestartTime: '',
      fieldNumber: 1,
      cycleTime: 0,
      redScore: 5,
      redMinPen: 0,
      redMajPen: 0,
      blueScore: 4,
      blueMinPen: 0,
      blueMajPen: 0,
      active: 0,
      result: 1,
      uploaded: 0
    }
  });
  assert.equal(patchMatch.statusCode, 200);

  const patchDetails = await app.inject({
    method: 'PATCH',
    url: `/match/details/${eventKey}/${tournamentKey}/${id}`,
    payload: {
      eventKey,
      tournamentKey,
      id,
      coopertition: 1
    }
  });
  assert.equal(patchDetails.statusCode, 200);

  const patchParticipants = await app.inject({
    method: 'PATCH',
    url: `/match/participants/${eventKey}/${tournamentKey}/${id}`,
    payload: [
      {
        eventKey,
        tournamentKey,
        id,
        station: 10,
        teamKey: 1001,
        disqualified: 0,
        cardStatus: 1,
        surrogate: 0,
        noShow: 0
      }
    ]
  });
  assert.equal(patchParticipants.statusCode, 200);

  const historyRes = await app.inject({
    method: 'GET',
    url: `/match/history/${eventKey}/${tournamentKey}/${id}?includeActions=false`
  });
  assert.equal(historyRes.statusCode, 200);
  const historyBody = historyRes.json() as {
    history: {
      base: { revision: number; name: string; redScore: number }[];
      details: { revision: number }[];
    };
  };

  assert.ok(historyBody.history.base.length >= 3);
  assert.ok(historyBody.history.details.length >= 3);

  const revisions = historyBody.history.base.map((row) => row.revision);
  for (let i = 1; i < revisions.length; i++) {
    assert.equal(revisions[i], revisions[i - 1] + 1);
  }

  const firstSnapshot = historyBody.history.base[0];
  const lastSnapshot =
    historyBody.history.base[historyBody.history.base.length - 1];
  assert.equal(firstSnapshot.name, 'Q1 Updated');
  assert.equal(firstSnapshot.redScore, 5);
  assert.equal(lastSnapshot.redScore, 5);

  await app.close();
  await db.db.close();
  await rm(`${getAppData('ems')}${sep}${eventKey}.db`, { force: true });
});
