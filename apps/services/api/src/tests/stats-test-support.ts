import { AsyncDatabase } from 'promised-sqlite3';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, basename, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CalculatorContext } from '@toa-lib/models/seasons/stats';
/** `appData: true` lays the databases out as `<base>/ems/*` so `APPDATA=<base>` points `getDB()` (and the real controllers) at them. */
export async function eventFixture({ appData = false } = {}) {
  const base = await mkdtemp(join(tmpdir(), 'ems-stats-')),
    root = appData ? join(base, 'ems') : base;
  if (appData) await mkdir(root);
  const module = await import(
      pathToFileURL(
        resolve('../../../libs/models/build/seasons/stats/tests/fixture.js')
      ).href
    ),
    ctx = module.fixture() as CalculatorContext;
  const db = await AsyncDatabase.open(join(root, ctx.eventKey + '.db')),
    global = await AsyncDatabase.open(join(root, 'global.db'));
  await db.exec(
    'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;'
  );
  await db.exec(await readFile('sql/create_event.sql', 'utf8'));
  await db.exec(await readFile('sql/seasons/fgc_2026.sql', 'utf8'));
  await global.exec(
    'CREATE TABLE event(eventKey TEXT PRIMARY KEY,seasonKey TEXT); CREATE TABLE fcs_settings(field TEXT PRIMARY KEY,data TEXT);'
  );
  await global.run('INSERT INTO event VALUES (?,?)', [
    ctx.eventKey,
    ctx.seasonKey
  ]);
  for (const row of ctx.settings)
    await global.run('INSERT INTO fcs_settings VALUES (?,?)', [
      String(row.fieldNumber),
      JSON.stringify({ wildfireBallsPerLed: row.wildfireBallsPerLed })
    ]);
  const insert = async (table: string, row: Record<string, unknown>) => {
    const cols = await db.all<{ name: string }>(
        'PRAGMA table_info(' + table + ')'
      ),
      entries = Object.entries(row).filter(
        ([k, v]) => v !== undefined && cols.some((c) => c.name === k)
      );
    await db.run(
      'INSERT INTO ' +
        table +
        ' (' +
        entries.map(([k]) => '"' + k + '"').join(',') +
        ') VALUES (' +
        entries.map(() => '?').join(',') +
        ')',
      entries.map(([, v]) => (typeof v === 'boolean' ? Number(v) : v))
    );
  };
  for (const t of ctx.tournaments)
    await insert('tournament', { ...t, fields: t.fields.join(',') });
  for (const team of ctx.teams) await insert('team', team);
  for (const m of ctx.matches) {
    const { details, participants, ...base } = m;
    await insert('match', base);
    await insert('match_detail', details!);
    for (const p of participants!) await insert('match_participant', p);
  }
  for (const a of ctx.alliances) await insert('alliance', a);
  for (const r of ctx.rankings) await insert('ranking', r);
  for (const row of ctx.history) await insert('match_history_base', row);
  for (const row of ctx.detailHistory)
    await insert('match_detail_history', row);
  for (const row of ctx.actions) await insert('match_action_event', row);
  return {
    base,
    root,
    ctx,
    db,
    global,
    insert,
    async close() {
      await db.close();
      await global.close();
      if (
        !resolve(base).startsWith(resolve(tmpdir()) + sep) ||
        !basename(base).startsWith('ems-stats-')
      )
        throw new Error('Unsafe test cleanup path');
      await rm(base, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100
      });
    }
  };
}
export const pause = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export async function until(
  condition: () => boolean | Promise<boolean>,
  timeout = 15000
) {
  const end = Date.now() + timeout;
  while (!(await condition())) {
    if (Date.now() > end) throw new Error('Condition timed out');
    await pause(10);
  }
}
