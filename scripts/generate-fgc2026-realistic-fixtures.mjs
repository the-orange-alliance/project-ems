import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AsyncDatabase } from "promised-sqlite3";
import { getFunctionsBySeasonKey } from "@toa-lib/models";

// A deterministic, moderately realistic FGC 2026 qualification event.
//
// Produces two databases:
//   * fgc2026_realistic_partial - 180 teams, 150 scheduled qualification
//     matches, the first 75 (50%) played.
//   * fgc2026_realistic_full    - the same event with all 150 matches played.
//
// Both are copied into the EMS app-data directory under the file name the
// server loads them by (<eventKey>.db), and both events are registered in
// global.db so the API, stats, and graphics services recognize them.
//
// The canonical artifacts live under scripts/fixtures (kept out of source
// control); this file is the source of truth for regenerating them. Re-run
// from the repository root with:
//
//     node scripts/generate-fgc2026-realistic-fixtures.mjs

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "fixtures", "fgc2026-realistic");

const SEASON_KEY = "fgc_2026";
const BASE_EVENT_KEY = "fgc2026_realistic";
const TOURNAMENT_KEY = "q";
const TEAM_COUNT = 180;
const TEAM_MATCHES = 5;
const ROBOTS_PER_MATCH = 6;
const MATCH_COUNT = (TEAM_COUNT * TEAM_MATCHES) / ROBOTS_PER_MATCH; // 150
const PARTIAL_COMPLETED = MATCH_COUNT / 2; // 75
const MATCHES_PER_ROUND = TEAM_COUNT / ROBOTS_PER_MATCH; // 30
const DAY_ONE_MATCHES = Math.ceil(MATCH_COUNT / 2);
const START = Date.parse("2026-04-18T13:00:00.000Z");
const STEP_MS = 5 * 60 * 1000;

if (!Number.isInteger(MATCH_COUNT) || !Number.isInteger(PARTIAL_COMPLETED)) {
  throw new Error(
    `TEAM_COUNT * TEAM_MATCHES must divide evenly by ${ROBOTS_PER_MATCH} and by 2`,
  );
}

const season = getFunctionsBySeasonKey(SEASON_KEY);
if (
  !season?.calculateScore ||
  !season.calculateRankings ||
  !season.calculateRankingPoints
) {
  throw new Error(
    `@toa-lib/models has no usable functions for season ${SEASON_KEY} (build libs/models?)`,
  );
}
const { calculateScore, calculateRankings, calculateRankingPoints } = season;

const sqlDir = join(HERE, "..", "apps", "services", "api", "sql");
const eventSchema = await readFile(join(sqlDir, "create_event.sql"), "utf8");
const seasonSchema = await readFile(
  join(sqlDir, "seasons", "fgc_2026.sql"),
  "utf8",
);
const globalSchema = await readFile(join(sqlDir, "create_global.sql"), "utf8");

// Mirrors libs/server/src/Appdata.ts so the fixtures land where the server
// actually reads them without pulling the server package into this script.
function appDataEmsDir() {
  const base =
    process.env.APPDATA ||
    (platform() === "win32"
      ? join(homedir(), "AppData", "Roaming")
      : platform() === "darwin"
        ? join(homedir(), "Library", "Application Support")
        : join(homedir(), ".config"));
  return join(base, base === homedir() ? ".ems" : "ems");
}

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffled(values, next) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function integer(next, min, max) {
  return Math.floor(next() * (max - min + 1)) + min;
}

function pick(next, values) {
  return values[Math.floor(next() * values.length)];
}

function iso(value) {
  return new Date(value).toISOString();
}

async function insert(db, table, row) {
  const entries = Object.entries(row);
  await db.run(
    `INSERT INTO "${table}" (${entries.map(([key]) => `"${key}"`).join(",")}) VALUES (${entries
      .map(() => "?")
      .join(",")})`,
    entries.map(([, value]) =>
      typeof value === "boolean" ? Number(value) : value,
    ),
  );
}

// Every team plays exactly once per round; TEAM_MATCHES rounds gives each team
// TEAM_MATCHES appearances. rosters[id - 1] is the six team keys for match id.
function makeRoster(next) {
  const teams = Array.from({ length: TEAM_COUNT }, (_, index) => 1001 + index);
  const roster = [];
  for (let round = 0; round < TEAM_MATCHES; round++) {
    const order = shuffled(teams, next);
    for (let offset = 0; offset < TEAM_COUNT; offset += ROBOTS_PER_MATCH) {
      roster.push(order.slice(offset, offset + ROBOTS_PER_MATCH));
    }
  }
  return roster;
}

// BraceState enum values, weighted toward the lower end so most robots either
// do not climb or only make contact.
const BRACE_STATES = [0, 0, 0, 0.05, 0.05, 0.1, 0.1, 0.2, 0.3];

function makeDetails(next, eventKey, id) {
  const raw = {
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id,
    wildfireInRedSuppressionUnit: integer(next, 24, 108),
    wildfireInBlueSuppressionUnit: integer(next, 24, 108),
    wildfireInExtinguisher: integer(next, 10, 58),
    redRobotOneBraceState: pick(next, BRACE_STATES),
    redRobotTwoBraceState: pick(next, BRACE_STATES),
    redRobotThreeBraceState: pick(next, BRACE_STATES),
    blueRobotOneBraceState: pick(next, BRACE_STATES),
    blueRobotTwoBraceState: pick(next, BRACE_STATES),
    blueRobotThreeBraceState: pick(next, BRACE_STATES),
    redRobotOnePartnerClimb: next() < 0.1,
    redRobotTwoPartnerClimb: next() < 0.1,
    redRobotThreePartnerClimb: next() < 0.1,
    blueRobotOnePartnerClimb: next() < 0.1,
    blueRobotTwoPartnerClimb: next() < 0.1,
    blueRobotThreePartnerClimb: next() < 0.1,
  };
  // Refs may enter either the real ball count or the 1:1 LED count; with the
  // default balls-per-LED ratio of 1 the two are equal.
  raw.approximateWildfireInRedSuppressionUnit =
    raw.wildfireInRedSuppressionUnit;
  raw.approximateWildfireInBlueSuppressionUnit =
    raw.wildfireInBlueSuppressionUnit;
  raw.approximateWildfireInExtinguisher = raw.wildfireInExtinguisher;
  raw.coopertition = 0;
  raw.redClimbMultiplier = 0;
  raw.blueClimbMultiplier = 0;
  raw.redPartnerClimbPoints = 0;
  raw.bluePartnerClimbPoints = 0;
  // Fill the derived fields (coopertition, climb multipliers, partner-climb
  // points) exactly the way the season code does.
  return calculateRankingPoints(raw);
}

function buildMatch(id, roster, next) {
  const details = makeDetails(next, BASE_EVENT_KEY, id);
  const redMinPen = next() < 0.13 ? integer(next, 1, 3) : 0;
  const redMajPen = next() < 0.03 ? 1 : 0;
  const blueMinPen = next() < 0.13 ? integer(next, 1, 3) : 0;
  const blueMajPen = next() < 0.03 ? 1 : 0;
  const [redScore, blueScore] = calculateScore({
    details,
    redMinPen,
    redMajPen,
    blueMinPen,
    blueMajPen,
  });
  return {
    id,
    roster,
    details,
    redMinPen,
    redMajPen,
    blueMinPen,
    blueMajPen,
    redScore,
    blueScore,
    result: redScore === blueScore ? 0 : redScore > blueScore ? 1 : 2,
  };
}

function participantsFor(match, eventKey) {
  return match.roster.map((teamKey, index) => ({
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id: match.id,
    station: index < 3 ? 11 + index : 21 + (index - 3),
    teamKey,
    disqualified: 0,
    cardStatus: 0,
    surrogate: 0,
    noShow: 0,
  }));
}

async function createSkeleton(path, eventKey) {
  for (const suffix of ["", "-wal", "-shm"])
    await rm(path + suffix, { force: true });
  const db = await AsyncDatabase.open(path);
  // The shipped schema has a few legacy foreign keys that reference one column
  // of a composite key. The application leaves enforcement disabled; do the
  // same here and validate the fixture counts below instead.
  await db.exec(
    "PRAGMA journal_mode = DELETE; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = OFF;",
  );
  await db.exec(eventSchema);
  await db.exec(seasonSchema);

  await insert(db, "tournament", {
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    tournamentLevel: 2,
    tournamentType: "Qualification",
    fieldCount: 3,
    fields: "1,2,3",
    name: "Igniting Innovation Qualification",
  });

  for (let index = 0; index < TEAM_COUNT; index++) {
    const teamKey = 1001 + index;
    await insert(db, "team", {
      eventKey,
      teamKey,
      teamNumber: String(teamKey),
      teamNameShort: `Team ${teamKey}`,
      teamNameLong: `Team ${teamKey} Robotics`,
      robotName: `R${teamKey}`,
      city: ["Boston", "Austin", "Toronto", "Denver", "Raleigh"][index % 5],
      stateProv: ["MA", "TX", "ON", "CO", "NC"][index % 5],
      country: index % 5 === 2 ? "Canada" : "United States",
      countryCode: index % 5 === 2 ? "CA" : "US",
      rookieYear: 2018 + (index % 9),
      cardStatus: 0,
      hasCard: 0,
      cardPhase: null,
    });
  }

  for (let id = 1; id <= MATCH_COUNT; id++) {
    await insert(db, "schedule", {
      eventKey,
      tournamentKey: TOURNAMENT_KEY,
      id,
      name: `Qualification ${id}`,
      type: "Qualification",
      day: id <= DAY_ONE_MATCHES ? 1 : 2,
      startTime: iso(START + (id - 1) * STEP_MS),
      duration: 150,
      isMatch: 1,
    });
  }

  await insert(db, "schedule_params", {
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    type: "Qualification",
    days: JSON.stringify([1, 2]),
    matchConcurrency: 3,
    teamKeys: JSON.stringify(
      Array.from({ length: TEAM_COUNT }, (_, i) => 1001 + i),
    ),
    matchesPerTeam: TEAM_MATCHES,
    cycleTime: 300,
    hasPremiereField: 0,
    options: "{}",
  });

  return db;
}

async function writeCompleted(db, match, eventKey) {
  const start = START + (match.id - 1) * STEP_MS;
  await insert(db, "match", {
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id: match.id,
    name: `Qualification Match ${match.id}`,
    scheduledTime: iso(start),
    actualStartTime: iso(start + 45_000),
    prestartTime: iso(start - 60_000),
    fieldNumber: ((match.id - 1) % 3) + 1,
    cycleTime: 150,
    redScore: match.redScore,
    redMinPen: match.redMinPen,
    redMajPen: match.redMajPen,
    blueScore: match.blueScore,
    blueMinPen: match.blueMinPen,
    blueMajPen: match.blueMajPen,
    active: 0,
    result: match.result,
    uploaded: 1,
    updatedAtUtc: iso(start + 210_000),
  });
  await insert(db, "match_detail", {
    ...match.details,
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id: match.id,
  });
  for (const participant of participantsFor(match, eventKey)) {
    await insert(db, "match_participant", participant);
  }
}

async function writeUnplayed(db, match, eventKey) {
  const start = START + (match.id - 1) * STEP_MS;
  await insert(db, "match", {
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id: match.id,
    name: `Qualification Match ${match.id}`,
    scheduledTime: iso(start),
    actualStartTime: "",
    prestartTime: "",
    fieldNumber: ((match.id - 1) % 3) + 1,
    cycleTime: 150,
    redScore: 0,
    redMinPen: 0,
    redMajPen: 0,
    blueScore: 0,
    blueMinPen: 0,
    blueMajPen: 0,
    active: 0,
    result: -1,
    uploaded: 0,
    updatedAtUtc: iso(start),
  });
  await insert(db, "match_detail", {
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id: match.id,
  });
  for (const participant of participantsFor(match, eventKey)) {
    await insert(db, "match_participant", participant);
  }
}

async function writeRankings(db, completed, eventKey) {
  const matches = completed.map((match) => ({
    eventKey,
    tournamentKey: TOURNAMENT_KEY,
    id: match.id,
    redScore: match.redScore,
    blueScore: match.blueScore,
    redMinPen: match.redMinPen,
    redMajPen: match.redMajPen,
    blueMinPen: match.blueMinPen,
    blueMajPen: match.blueMajPen,
    result: match.result,
    details: {
      ...match.details,
      eventKey,
      tournamentKey: TOURNAMENT_KEY,
      id: match.id,
    },
    participants: participantsFor(match, eventKey),
  }));
  const rankings = calculateRankings(matches, []);
  await db.run('DELETE FROM "ranking" WHERE eventKey = ?', [eventKey]);
  for (const ranking of rankings) {
    await insert(db, "ranking", {
      eventKey,
      tournamentKey: TOURNAMENT_KEY,
      teamKey: ranking.teamKey,
      rank: ranking.rank,
      rankChange: ranking.rankChange,
      played: ranking.played,
      wins: ranking.wins,
      losses: ranking.losses,
      ties: ranking.ties,
      rankingScore: ranking.rankingScore,
      highestScore: ranking.highestScore,
      climbPoints: ranking.climbPoints,
    });
  }
  return rankings.length;
}

async function assertCounts(db, eventKey, expectedPlayed) {
  const one = async (sql, params) => (await db.get(sql, params)).n;
  const teams = await one('SELECT COUNT(*) n FROM "team" WHERE eventKey = ?', [
    eventKey,
  ]);
  const schedule = await one(
    'SELECT COUNT(*) n FROM "schedule" WHERE eventKey = ?',
    [eventKey],
  );
  const matches = await one(
    'SELECT COUNT(*) n FROM "match" WHERE eventKey = ?',
    [eventKey],
  );
  const details = await one(
    'SELECT COUNT(*) n FROM "match_detail" WHERE eventKey = ?',
    [eventKey],
  );
  const parts = await one(
    'SELECT COUNT(*) n FROM "match_participant" WHERE eventKey = ?',
    [eventKey],
  );
  const played = await one(
    'SELECT COUNT(*) n FROM "match" WHERE eventKey = ? AND result >= 0',
    [eventKey],
  );
  const rankings = await one(
    'SELECT COUNT(*) n FROM "ranking" WHERE eventKey = ?',
    [eventKey],
  );
  const problems = [];
  if (teams !== TEAM_COUNT) problems.push(`teams ${teams} != ${TEAM_COUNT}`);
  if (schedule !== MATCH_COUNT)
    problems.push(`schedule ${schedule} != ${MATCH_COUNT}`);
  if (matches !== MATCH_COUNT)
    problems.push(`matches ${matches} != ${MATCH_COUNT}`);
  if (details !== MATCH_COUNT)
    problems.push(`match_detail ${details} != ${MATCH_COUNT}`);
  if (parts !== MATCH_COUNT * ROBOTS_PER_MATCH)
    problems.push(
      `match_participant ${parts} != ${MATCH_COUNT * ROBOTS_PER_MATCH}`,
    );
  if (played !== expectedPlayed)
    problems.push(`played ${played} != ${expectedPlayed}`);
  if (rankings < 1) problems.push("no ranking rows");
  if (problems.length) throw new Error(`${eventKey}: ${problems.join("; ")}`);
  return { teams, schedule, matches, played, rankings };
}

async function buildDatabase(path, eventKey, playThrough) {
  const db = await createSkeleton(path, eventKey);
  try {
    for (const match of matches) {
      if (match.id <= playThrough) await writeCompleted(db, match, eventKey);
      else await writeUnplayed(db, match, eventKey);
    }
    await writeRankings(db, matches.slice(0, playThrough), eventKey);
    return await assertCounts(db, eventKey, playThrough);
  } finally {
    await db.close();
  }
}

async function registerEvent(globalPath, eventKey, eventName) {
  const db = await AsyncDatabase.open(globalPath);
  try {
    await db.exec("PRAGMA busy_timeout = 5000;");
    // create_global.sql is CREATE TABLE IF NOT EXISTS, so this is a no-op
    // against a live global.db and bootstraps one the API has never created.
    await db.exec(globalSchema);
    await db.run(
      `INSERT INTO "event" (
         eventKey, seasonKey, regionKey, eventTypeKey, eventName, divisionName,
         venue, city, stateProv, startDate, endDate, country, website
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(eventKey) DO UPDATE SET
         seasonKey = excluded.seasonKey, regionKey = excluded.regionKey,
         eventTypeKey = excluded.eventTypeKey, eventName = excluded.eventName,
         divisionName = excluded.divisionName, venue = excluded.venue,
         city = excluded.city, stateProv = excluded.stateProv,
         startDate = excluded.startDate, endDate = excluded.endDate,
         country = excluded.country, website = excluded.website`,
      [
        eventKey,
        SEASON_KEY,
        "TEST",
        "qual",
        eventName,
        "Qualification Fixture",
        "Synthetic Test Venue",
        "Testville",
        "MI",
        iso(START),
        iso(START + (MATCH_COUNT + 12) * STEP_MS),
        "United States",
        "",
      ],
    );
  } finally {
    await db.close();
  }
}

async function install(srcPath, eventKey, emsDir) {
  const dbPath = join(emsDir, `${eventKey}.db`);
  // Drop any prior copy plus its WAL sidecars and the stale stats cache so the
  // stats service rebuilds against the new data on first query.
  for (const target of [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`,
    join(emsDir, `${eventKey}.stats.db`),
    join(emsDir, `${eventKey}.stats.db-wal`),
    join(emsDir, `${eventKey}.stats.db-shm`),
  ]) {
    await rm(target, { force: true });
  }
  await copyFile(srcPath, dbPath);
  return dbPath;
}

await mkdir(ROOT, { recursive: true });
const emsDir = appDataEmsDir();
await mkdir(emsDir, { recursive: true });

const rosters = makeRoster(random(0x20260418));
// One deterministic pass builds every match. The partial and full databases
// share these objects, so matches 1..75 are identical between the two.
const matchRng = random(0x51a7c0de);
const matches = rosters.map((roster, index) =>
  buildMatch(index + 1, roster, matchRng),
);

const targets = [
  {
    eventKey: `${BASE_EVENT_KEY}_partial`,
    eventName: "FGC 2026 Realistic Statistics Partial",
    srcPath: join(ROOT, "fgc2026-realistic-partial.db"),
    playThrough: PARTIAL_COMPLETED,
  },
  {
    eventKey: `${BASE_EVENT_KEY}_full`,
    eventName: "FGC 2026 Realistic Statistics Full",
    srcPath: join(ROOT, "fgc2026-realistic-full.db"),
    playThrough: MATCH_COUNT,
  },
];

const globalPath = join(emsDir, "global.db");
const summary = [];
for (const target of targets) {
  const counts = await buildDatabase(
    target.srcPath,
    target.eventKey,
    target.playThrough,
  );
  const installedPath = await install(target.srcPath, target.eventKey, emsDir);
  await registerEvent(globalPath, target.eventKey, target.eventName);
  summary.push({
    eventKey: target.eventKey,
    seasonKey: SEASON_KEY,
    teams: counts.teams,
    matches: counts.matches,
    played: counts.played,
    rankings: counts.rankings,
    fixture: target.srcPath,
    installed: installedPath,
  });
}

console.log(
  JSON.stringify(
    {
      teamsPerEvent: TEAM_COUNT,
      matchesPerTeam: TEAM_MATCHES,
      matchesPerEvent: MATCH_COUNT,
      globalDatabase: globalPath,
      events: summary,
    },
    null,
    2,
  ),
);
