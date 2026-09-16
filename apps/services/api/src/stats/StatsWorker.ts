import { parentPort } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { registryForSeason, assertJson } from '@toa-lib/models/seasons/stats';
import { loadSnapshot, type StatsWork } from './EventStatsSnapshot.js';
import { workerResultSchema } from './StatsSchemas.js';
if (!parentPort) throw new Error('StatsWorker must run in a worker thread');
parentPort.on(
  'message',
  async (message: { jobId: string; work: StatsWork }) => {
    try {
      const start = performance.now(),
        definition = registryForSeason(message.work.seasonKey).find(
          (d) => d.slug === message.work.query.stat
        );
      if (!definition || definition.version !== message.work.calculatorVersion)
        throw new Error('Calculator version is unavailable in this worker');
      const { ctx, ...metadata } = await loadSnapshot(message.work, definition);
      const result = await definition.compute(
        ctx,
        definition.paramsSchema.parse(message.work.query.params),
        message.work.query.selectors
      );
      assertJson(result);
      const payload = {
        result: definition.resultSchema.parse(result),
        ...metadata,
        calculatorVersion: definition.version,
        computeMs: performance.now() - start,
        calculatedAsOfUtc: ctx.calculatedAsOfUtc
      };
      assertJson(payload);
      parentPort!.postMessage({
        jobId: message.jobId,
        ok: true,
        payload: workerResultSchema.parse(payload)
      });
    } catch (error) {
      parentPort!.postMessage({
        jobId: message.jobId,
        ok: false,
        statusCode: (error as { statusCode?: number })?.statusCode,
        error:
          error instanceof Error ? error.message : 'Statistics worker failed'
      });
    }
  }
);
// Imports resolved and the handler is installed: this worker can run work.
parentPort.postMessage({ ready: true });
