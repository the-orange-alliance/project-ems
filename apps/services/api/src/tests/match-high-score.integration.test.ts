import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { rm } from 'node:fs/promises';
import { sep } from 'node:path';
import type { MatchHighScore, TournamentType } from '@toa-lib/models';
import { CardStatus } from '@toa-lib/models';
import matchController from '../controllers/Match.js';
import { EventDatabase, getDB } from '../db/EventDatabase.js';
import { getAppData } from '@toa-lib/server';

const RANKING = 'ranking';
const FINALS = 'finals';
const PRACTICE = 'practice';

interface SeedParticipant {
  station: number;
  teamKey: number;
  disqualified?: number;
  cardStatus?: number;
  surrogate?: number;
}

interface SeedMatch {
  tournamentKey: string;
  id: number;
  redScore: number;
  blueScore: number;
  /** Defaults to a red win / played. Pass -1 for a match that never ran. */
  result?: number;
  participants?: SeedParticipant[];
}

const seedTournament = async (
  db: EventDatabase,
  eventKey: string,
  tournamentKey: string,
  tournamentType: TournamentType,
  tournamentLevel: number
) =>
  db.insertValue('tournament', [
    {
      eventKey,
      tournamentKey,
      tournamentLevel,
      tournamentType,
      fieldCount: 1,
      fields: '1',
      name: `${tournamentType} Tournament`
    }
  ]);

const seedMatch = async (
  db: EventDatabase,
  eventKey: string,
  m: SeedMatch
) => {
  await db.insertValue('match', [
    {
      eventKey,
      tournamentKey: m.tournamentKey,
      id: m.id,
      name: `${m.tournamentKey} ${m.id}`,
      scheduledTime: '',
      actualStartTime: '',
      prestartTime: '',
      fieldNumber: 1,
      cycleTime: 0,
      redScore: m.redScore,
      redMinPen: 0,
      redMajPen: 0,
      blueScore: m.blueScore,
      blueMinPen: 0,
      blueMajPen: 0,
      active: 0,
      result: m.result ?? 1,
      uploaded: 0,
      updatedAtUtc: new Date().toISOString()
    }
  ]);
  const participants = m.participants ?? [
    { station: 11, teamKey: 1000 + m.id },
    { station: 21, teamKey: 2000 + m.id }
  ];
  await db.insertValue(
    'match_participant',
    participants.map((p) => ({
      eventKey,
      tournamentKey: m.tournamentKey,
      id: m.id,
      station: p.station,
      teamKey: p.teamKey,
      disqualified: p.disqualified ?? 0,
      cardStatus: p.cardStatus ?? CardStatus.NO_CARD,
      surrogate: p.surrogate ?? 0,
      noShow: 0
    }))
  );
};

/**
 * Builds a fresh single-event database with ranking, finals and practice
 * tournaments, seeds the given matches, and returns a Fastify app serving the
 * match controller plus a teardown.
 */
const harness = async (label: string, matches: SeedMatch[]) => {
  const eventKey = `fgc-highscore-${label}-${Date.now()}`;
  const db = await getDB(eventKey);
  await db.createEventBase();
  await db.createEventGameSpecifics('fgc_2026');

  await seedTournament(db, eventKey, RANKING, 'Ranking', 30);
  await seedTournament(db, eventKey, FINALS, 'Finals', 400);
  await seedTournament(db, eventKey, PRACTICE, 'Practice', 1);

  for (const m of matches) await seedMatch(db, eventKey, m);

  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(matchController, { prefix: '/match' });

  const ask = async (
    tournamentKey: string,
    id: number
  ): Promise<MatchHighScore> => {
    const res = await app.inject({
      method: 'GET',
      url: `/match/high-score/${eventKey}/${tournamentKey}/${String(id)}`
    });
    assert.equal(res.statusCode, 200);
    return res.json() as MatchHighScore;
  };

  const teardown = async () => {
    await app.close();
    await db.db.close();
    const dbPath = `${getAppData('ems')}${sep}${eventKey}.db`;
    for (const suffix of ['', '-wal', '-shm']) {
      await rm(dbPath + suffix, { force: true });
    }
  };

  return { ask, teardown, app: app as FastifyInstance, eventKey };
};

test('the first played match of a phase is not a record', async () => {
  const { ask, teardown } = await harness('first', [
    { tournamentKey: RANKING, id: 1, redScore: 120, blueScore: 90 }
  ]);
  try {
    // Nothing to beat means it is simply the first result. Treating it as a
    // record would put the banner on the opening match of every event.
    const got = await ask(RANKING, 1);
    assert.equal(got.isNewHighScore, false);
    assert.equal(got.alliance, null);
    assert.equal(got.score, null);
    assert.equal(got.previousScore, null);
    assert.equal(got.tournamentType, 'Ranking');
  } finally {
    await teardown();
  }
});

test('the second match takes the record once there is one to beat', async () => {
  const { ask, teardown } = await harness('second', [
    { tournamentKey: RANKING, id: 1, redScore: 120, blueScore: 90 },
    { tournamentKey: RANKING, id: 2, redScore: 130, blueScore: 40 }
  ]);
  try {
    const got = await ask(RANKING, 2);
    assert.equal(got.isNewHighScore, true);
    assert.equal(got.alliance, 'red');
    assert.equal(got.score, 130);
    assert.equal(got.previousScore, 120);
  } finally {
    await teardown();
  }
});

test('a later higher match takes the record from the earlier one', async () => {
  const { ask, teardown } = await harness('later', [
    { tournamentKey: RANKING, id: 1, redScore: 120, blueScore: 90 },
    { tournamentKey: RANKING, id: 2, redScore: 80, blueScore: 200 }
  ]);
  try {
    const second = await ask(RANKING, 2);
    assert.equal(second.isNewHighScore, true);
    assert.equal(second.alliance, 'blue');
    assert.equal(second.score, 200);
    assert.equal(second.previousScore, 120);

    // Re-opening the earlier match's results must not re-claim the record.
    const first = await ask(RANKING, 1);
    assert.equal(first.isNewHighScore, false);
    assert.equal(first.alliance, null);
    assert.equal(first.score, null);
    assert.equal(first.previousScore, 200);
  } finally {
    await teardown();
  }
});

test('equalling the record is not a new record', async () => {
  const { ask, teardown } = await harness('equal', [
    { tournamentKey: RANKING, id: 1, redScore: 150, blueScore: 10 },
    { tournamentKey: RANKING, id: 2, redScore: 150, blueScore: 10 }
  ]);
  try {
    const got = await ask(RANKING, 2);
    assert.equal(got.isNewHighScore, false);
    assert.equal(got.previousScore, 150);
  } finally {
    await teardown();
  }
});

test('a red-carded alliance cannot take the record', async () => {
  const { ask, teardown } = await harness('redcard', [
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 50 },
    {
      tournamentKey: RANKING,
      id: 2,
      redScore: 400,
      blueScore: 60,
      participants: [
        { station: 11, teamKey: 1101, cardStatus: CardStatus.RED_CARD },
        { station: 12, teamKey: 1102 },
        { station: 21, teamKey: 2101 }
      ]
    }
  ]);
  try {
    // Red's 400 is the highest raw score in the event, but a card does not zero
    // the stored score, so the endpoint has to exclude it here.
    const carded = await ask(RANKING, 2);
    assert.equal(carded.isNewHighScore, false);
    assert.equal(carded.score, null);
    assert.equal(carded.previousScore, 100);

    // And it must not become the record for anyone else either.
    const clean = await ask(RANKING, 1);
    assert.equal(clean.isNewHighScore, true);
    assert.equal(clean.score, 100);
  } finally {
    await teardown();
  }
});

test('a disqualified alliance cannot take the record', async () => {
  const { ask, teardown } = await harness('dq', [
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 50 },
    {
      tournamentKey: RANKING,
      id: 2,
      redScore: 20,
      blueScore: 400,
      participants: [
        { station: 11, teamKey: 1201 },
        { station: 21, teamKey: 2201, disqualified: 1 }
      ]
    }
  ]);
  try {
    const got = await ask(RANKING, 2);
    assert.equal(got.isNewHighScore, false);
    assert.equal(got.previousScore, 100);
  } finally {
    await teardown();
  }
});

test('a surrogate does not make an alliance ineligible', async () => {
  const { ask, teardown } = await harness('surrogate', [
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 50 },
    {
      tournamentKey: RANKING,
      id: 2,
      redScore: 300,
      blueScore: 60,
      participants: [
        { station: 11, teamKey: 1301, surrogate: 1 },
        { station: 21, teamKey: 2301 }
      ]
    }
  ]);
  try {
    const got = await ask(RANKING, 2);
    assert.equal(got.isNewHighScore, true);
    assert.equal(got.alliance, 'red');
    assert.equal(got.score, 300);
  } finally {
    await teardown();
  }
});

test('qualification and playoff records are independent', async () => {
  const { ask, teardown } = await harness('phases', [
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 50 },
    { tournamentKey: FINALS, id: 1, redScore: 900, blueScore: 800 },
    { tournamentKey: RANKING, id: 2, redScore: 150, blueScore: 50 }
  ]);
  try {
    // A 900-point finals score must not freeze the ranking record.
    const ranking = await ask(RANKING, 2);
    assert.equal(ranking.isNewHighScore, true);
    assert.equal(ranking.score, 150);
    assert.equal(ranking.previousScore, 100);

    // The finals record is computed over playoff matches only - and this is the
    // only one, so it has nothing to beat.
    const finals = await ask(FINALS, 1);
    assert.equal(finals.isNewHighScore, false);
    assert.equal(finals.previousScore, null);
    assert.equal(finals.tournamentType, 'Finals');
  } finally {
    await teardown();
  }
});

test('playoff matches set a playoff record once there is one to beat', async () => {
  const { ask, teardown } = await harness('playoffrecord', [
    { tournamentKey: FINALS, id: 1, redScore: 700, blueScore: 650 },
    { tournamentKey: FINALS, id: 2, redScore: 400, blueScore: 880 },
    // A huge qualification score must not become the bar a playoff match has
    // to clear, nor the other way round.
    { tournamentKey: RANKING, id: 1, redScore: 950, blueScore: 10 },
    { tournamentKey: RANKING, id: 2, redScore: 960, blueScore: 10 }
  ]);
  try {
    const finals = await ask(FINALS, 2);
    assert.equal(finals.isNewHighScore, true);
    assert.equal(finals.alliance, 'blue');
    assert.equal(finals.score, 880);
    // 700, not the 950/960 posted in qualification.
    assert.equal(finals.previousScore, 700);

    const ranking = await ask(RANKING, 2);
    assert.equal(ranking.isNewHighScore, true);
    assert.equal(ranking.alliance, 'red');
    assert.equal(ranking.score, 960);
    // 950, not the 880 posted in the finals.
    assert.equal(ranking.previousScore, 950);
  } finally {
    await teardown();
  }
});

test('practice matches have no phase and never set a record', async () => {
  const { ask, teardown } = await harness('practice', [
    { tournamentKey: PRACTICE, id: 1, redScore: 999, blueScore: 10 },
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 50 }
  ]);
  try {
    const practice = await ask(PRACTICE, 1);
    assert.equal(practice.isNewHighScore, false);
    assert.equal(practice.previousScore, null);
    assert.equal(practice.tournamentType, 'Practice');

    // The 999 practice score must not leak into the ranking phase: if it did,
    // the ranking opener would have something to compare against and would
    // report a (losing) comparison rather than an empty one.
    const ranking = await ask(RANKING, 1);
    assert.equal(ranking.isNewHighScore, false);
    assert.equal(ranking.previousScore, null);
  } finally {
    await teardown();
  }
});

test('both alliances above the record and tied is unattributed', async () => {
  const { ask, teardown } = await harness('tie', [
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 90 },
    { tournamentKey: RANKING, id: 2, redScore: 250, blueScore: 250 }
  ]);
  try {
    const got = await ask(RANKING, 2);
    assert.equal(got.isNewHighScore, true);
    assert.equal(got.alliance, null);
    assert.equal(got.score, 250);
    assert.equal(got.previousScore, 100);
  } finally {
    await teardown();
  }
});

test('unplayed matches are ignored on both sides of the comparison', async () => {
  const { ask, teardown } = await harness('unplayed', [
    { tournamentKey: RANKING, id: 1, redScore: 100, blueScore: 50 },
    // Scheduled but never run - a stale score here must not become the record.
    { tournamentKey: RANKING, id: 2, redScore: 500, blueScore: 500, result: -1 },
    { tournamentKey: RANKING, id: 3, redScore: 120, blueScore: 50 }
  ]);
  try {
    const played = await ask(RANKING, 3);
    assert.equal(played.isNewHighScore, true);
    assert.equal(played.score, 120);
    assert.equal(played.previousScore, 100);

    // Asking about the unplayed match reports the standing record, no claim.
    const unplayed = await ask(RANKING, 2);
    assert.equal(unplayed.isNewHighScore, false);
    assert.equal(unplayed.score, null);
    assert.equal(unplayed.previousScore, 120);
  } finally {
    await teardown();
  }
});

test('an unknown tournament is a data-not-found error', async () => {
  const { teardown, app, eventKey } = await harness('missing', []);
  try {
    const res = await app.inject({
      method: 'GET',
      url: `/match/high-score/${eventKey}/nope/1`
    });
    assert.equal(res.statusCode, 500);
  } finally {
    await teardown();
  }
});
