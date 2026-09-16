import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { definitions, normalizeQuery } from '@toa-lib/models/seasons/stats';
import { queryHash } from '@toa-lib/models/seasons/stats/query-hash';
import { StatsWorkerPool } from '../stats/StatsWorkerPool.js';
import { eventFixture } from './stats-test-support.js';
for (const [name, path] of [
  ['TypeScript', 'src/stats/StatsWorker.ts'],
  ['ncc', 'dist/stats-worker/index.js']
] as const) {
  test(
    name + ' worker entry executes a real database calculation',
    async () => {
      assert.ok(
        existsSync(path),
        'Build ' + name + ' entry before packaging verification'
      );
      const f = await eventFixture(),
        pool = new StatsWorkerPool({
          entry: pathToFileURL(resolve(path)),
          timeoutMs: 30000
        });
      try {
        const d = definitions.find((d) => d.catalogueId === 'B21')!,
          query = normalizeQuery({ eventKey: f.ctx.eventKey, stat: d.slug }, d);
        const result = await pool.enqueue({
          query,
          queryHash: queryHash(query),
          seasonKey: f.ctx.seasonKey,
          calculatorVersion: d.version,
          eventDatabasePath: join(f.root, f.ctx.eventKey + '.db'),
          globalDatabasePath: join(f.root, 'global.db')
        });
        assert.equal(result.result.status, 'ok');
        assert.equal((result.result as any).data, 3668);
      } finally {
        await pool.close();
        await f.close();
      }
    }
  );
}
