import test from 'node:test';
import assert from 'node:assert/strict';
import { matchZod } from '../../../base/Match.js';
import {
  calculateScore,
  defaultMatchDetails,
  FGC26MatchDetailsZod,
  IgnitingInnovationSeason
} from '../../FGC26_IgnitingInnovation.js';

const detailsFromJson = IgnitingInnovationSeason.functions!.detailsFromJson!;

/**
 * The scoring path is only as good as the details object handed to it: a single
 * missing field makes `calculateScore` multiply `undefined` and return NaN, which
 * serializes to `null` over the socket and blanks the score for the rest of the
 * match. These cover the two places that used to drop fields silently.
 */

/** A row as SQLite actually returns it - booleans stored in INT columns. */
const storedDetailsRow = () => ({
  ...defaultMatchDetails,
  eventKey: 'FGC_2026-TEST-1',
  tournamentKey: 't1',
  id: 1,
  wildfireInRedSuppressionUnit: 12,
  redRobotOnePartnerClimb: 1 as unknown as boolean,
  redRobotTwoPartnerClimb: 0 as unknown as boolean,
  redRobotThreePartnerClimb: 0 as unknown as boolean,
  blueRobotOnePartnerClimb: 0 as unknown as boolean,
  blueRobotTwoPartnerClimb: 0 as unknown as boolean,
  blueRobotThreePartnerClimb: 0 as unknown as boolean
});

const matchRow = (details: unknown) => ({
  eventKey: 'FGC_2026-TEST-1',
  tournamentKey: 't1',
  id: 1,
  name: 'Ranking Match 1',
  fieldNumber: 1,
  scheduledTime: '',
  prestartTime: '',
  actualStartTime: '',
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
  details
});

test('matchZod.parse keeps every season detail field', () => {
  const parsed = matchZod.parse(matchRow(storedDetailsRow())) as any;

  for (const key of Object.keys(FGC26MatchDetailsZod.shape)) {
    assert.ok(
      key in parsed.details,
      `matchZod.parse dropped details.${key} - season scoring would read undefined`
    );
  }
  assert.equal(parsed.details.wildfireInRedSuppressionUnit, 12);
});

test('a match that survived matchZod.parse still scores to a finite number', () => {
  const parsed = matchZod.parse(matchRow(storedDetailsRow())) as any;
  const [red, blue] = calculateScore(parsed);

  assert.ok(Number.isFinite(red), `red score was ${red}`);
  assert.ok(Number.isFinite(blue), `blue score was ${blue}`);
  // 12 WILDFIRE at x1 CLIMB MULTIPLIER, plus one 25-point PARTNER CLIMB.
  assert.equal(red, 37);
  assert.equal(blue, 0);
});

test('detailsFromJson parses a stored row and normalizes its booleans', () => {
  const details = detailsFromJson(storedDetailsRow());

  assert.ok(details, 'detailsFromJson rejected a row as SQLite stores it');
  assert.equal(details.redRobotOnePartnerClimb, true);
  assert.equal(details.redRobotTwoPartnerClimb, false);
});

test('detailsFromJson fills a column missing from the row with its default', () => {
  const row: Record<string, unknown> = storedDetailsRow();
  delete row.wildfireInExtinguisher;

  const details = detailsFromJson(row);

  assert.ok(details, 'detailsFromJson rejected a row with a missing column');
  assert.equal(details.wildfireInExtinguisher, 0);
});
