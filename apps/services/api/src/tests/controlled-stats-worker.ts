import { parentPort } from 'node:worker_threads';
parentPort!.on('message', ({ jobId, work }) => {
  const { params } = work.query,
    end = Date.now() + Number(params.delayMs ?? 0);
  while (Date.now() < end) {
    Math.sqrt(Date.now());
  }
  if (params.crash) process.exit(1);
  if (params.fail) {
    parentPort!.postMessage({ jobId, ok: false, error: 'fixture failure' });
    return;
  }
  const result = params.unavailable
    ? {
        status: 'unavailable',
        reason: 'Fixture prerequisite absent',
        warnings: []
      }
    : {
        status: 'ok',
        data: params.invalid ? new Map() : Number(params.value ?? 42),
        quality: 'complete',
        warnings: []
      };
  parentPort!.postMessage({
    jobId,
    ok: true,
    payload: {
      result,
      calculatorVersion: work.calculatorVersion,
      computeMs: 1,
      calculatedAsOfUtc: new Date().toISOString(),
      latestPlayedMatch: null,
      sourceMarker: {
        latestMatchUpdatedAtUtc: null,
        latestHistoryId: null,
        latestActionEventId: null
      },
      selectedTournamentKeys: []
    }
  });
});
parentPort!.postMessage({ ready: true });
