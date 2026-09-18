import { Worker } from 'node:worker_threads';
import { assertJson } from '@toa-lib/models/seasons/stats';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type StatsWork } from './EventStatsSnapshot.js';
import { workerResultSchema, type WorkerResult } from './StatsSchemas.js';
export class StatsServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}
type Origin = 'cold-miss' | 'stale-refresh' | 'explicit-refresh' | 'controller';
interface Job {
  jobId: string;
  origin: Origin;
  work: StatsWork;
  enqueuedAtUtc: string;
  enqueuedAtMs: number;
  startedAtUtc?: string;
  startedAtMs?: number;
  waitingRequestCount: number;
  resolve: (r: WorkerResult) => void;
  reject: (e: Error) => void;
  promise: Promise<WorkerResult>;
  timer: NodeJS.Timeout;
}
interface Slot {
  worker: Worker;
  job?: Job;
  replacing: boolean;
  /** Set by the worker's `ready` message (or its first job reply): its entry imported and it can run work. */
  ready: boolean;
  /** Consecutive start failures of the slots this one replaces; 0 after any worker that started. */
  startFailures: number;
}
export interface DegradedPool {
  entry: string;
  error: string;
  consecutiveStartFailures: number;
  parkedAtUtc: string;
}
/**
 * A worker that dies before reporting ready is a start failure (bad entry,
 * broken packaged import, crash in worker startup): it is respawned after
 * 250 ms, 500 ms, 1 s, 2 s and the pool parks as degraded on the 5th
 * consecutive failure (~4 s of retries). A broken entry is deterministic, so
 * retrying longer only burns CPU and logs; a transient failure gets a few
 * seconds. A parked pool stays parked until `recover()` (POST /stats/queue/recover).
 */
const START_FAILURE_CAP = 5;
const RESPAWN_BASE_MS = 250;
export function workerEntry() {
  if (process.env.STATS_WORKER_ENTRY)
    return pathToFileURL(process.env.STATS_WORKER_ENTRY);
  for (const relative of [
    './StatsWorker.js',
    '../stats-worker/index.js',
    './stats-worker/index.js',
    './StatsWorker.ts'
  ]) {
    const url = new URL(relative, import.meta.url);
    if (existsSync(url)) return url;
  }
  throw new Error('Statistics worker entry was not packaged');
}
/**
 * Timeout contract: `STATS_TIMEOUT_MS` is an END-TO-END deadline per job,
 * measured from enqueue and covering queue wait plus execution. Expiry is
 * reported as one of two distinct errors: starvation (the job never reached a
 * started worker - add workers or reduce queued work) or execution timeout
 * (the job was running; the worker is terminated - investigate the stat).
 */
export class StatsWorkerPool {
  private slots: Slot[] = [];
  private respawns = new Set<NodeJS.Timeout>();
  private spawnedWorkers = 0;
  private degraded: DegradedPool | null = null;
  private queued: Job[] = [];
  private flights = new Map<string, Job>();
  private version = 0;
  private closing = false;
  readonly capacity: number;
  readonly workerCount: number;
  private timeoutMs: number;
  private entry: URL;
  constructor(
    options: {
      workerCount?: number;
      capacity?: number;
      timeoutMs?: number;
      entry?: URL;
    } = {}
  ) {
    this.workerCount =
      options.workerCount ?? Number(process.env.STATS_WORKERS ?? 1);
    this.capacity =
      options.capacity ?? Number(process.env.STATS_QUEUE_CAPACITY ?? 64);
    this.timeoutMs =
      options.timeoutMs ?? Number(process.env.STATS_TIMEOUT_MS ?? 30000);
    this.entry = options.entry ?? workerEntry();
    if (
      !Number.isInteger(this.workerCount) ||
      this.workerCount < 1 ||
      this.workerCount > 16 ||
      !Number.isInteger(this.capacity) ||
      this.capacity < 0 ||
      this.capacity > 10000 ||
      !Number.isFinite(this.timeoutMs) ||
      this.timeoutMs < 1
    )
      throw new Error('Invalid statistics worker configuration');
    for (let i = 0; i < this.workerCount; i++) this.spawn();
  }
  private spawn(startFailures = 0) {
    let { entry } = this;
    if (entry.pathname.endsWith('.ts')) {
      const moduleName = ['tsx', 'esm', 'api'].join('/');
      const registerUrl = pathToFileURL(
        createRequire(import.meta.url).resolve(moduleName)
      ).href;
      entry = new URL(
        'data:text/javascript,' +
          encodeURIComponent(
            'import {register} from ' +
              JSON.stringify(registerUrl) +
              ';register();await import(' +
              JSON.stringify(entry.href) +
              ');'
          )
      );
    }
    // Eval/stdin launch flags describe the parent's entry, not this file worker.
    // Only pass an explicit execArgv when something must be stripped: Node
    // rejects process-wide flags (e.g. --v8-pool-size, --secure-heap, which
    // `node --test` children receive) in an explicit list, but inherits them.
    const filtered = process.execArgv.filter(
      (arg, i, args) =>
        !arg.startsWith('--input-type') &&
        (i === 0 || args[i - 1] !== '--input-type')
    );
    const execArgv =
      filtered.length === process.execArgv.length ? undefined : filtered;
    const worker = new Worker(entry, { execArgv }),
      slot: Slot = { worker, replacing: false, ready: false, startFailures };
    this.slots.push(slot);
    this.spawnedWorkers++;
    worker.on(
      'message',
      (message: {
        ready?: true;
        jobId: string;
        ok: boolean;
        payload?: unknown;
        error?: string;
        statusCode?: number;
      }) => {
        if (message.ready) {
          slot.ready = true;
          return;
        }
        if (!slot.job || message.jobId !== slot.job.jobId || slot.replacing)
          return;
        slot.ready = true;
        const { job } = slot;
        if (message.ok) {
          try {
            assertJson(message.payload);
            this.finish(
              slot,
              job,
              undefined,
              workerResultSchema.parse(message.payload)
            );
          } catch (e) {
            this.finish(
              slot,
              job,
              e instanceof Error ? e : new Error('Invalid worker result')
            );
          }
        } else
          this.finish(
            slot,
            job,
            new StatsServiceError(
              message.statusCode === 400 ? 400 : 503,
              message.error ?? 'Worker calculation failed'
            )
          );
      }
    );
    worker.on('error', (error) =>
      this.replace(
        slot,
        error instanceof Error ? error : new Error(String(error))
      )
    );
    worker.on('exit', (code) => {
      if (!slot.replacing && !this.closing)
        this.replace(
          slot,
          new StatsServiceError(
            503,
            slot.ready
              ? 'Statistics worker exited (' + code + ')'
              : 'Statistics worker exited (' + code + ') before it started'
          )
        );
    });
  }
  private finish(
    slot: Slot | undefined,
    job: Job,
    error?: Error,
    result?: WorkerResult
  ) {
    if (!this.flights.has(job.work.queryHash)) return;
    clearTimeout(job.timer);
    if (slot) slot.job = undefined;
    this.queued = this.queued.filter((j) => j !== job);
    this.flights.delete(job.work.queryHash);
    this.version++;
    if (error) job.reject(error);
    else job.resolve(result!);
    this.dispatch();
  }
  private replace(slot: Slot, error: Error) {
    if (slot.replacing) return;
    slot.replacing = true;
    const { job } = slot;
    if (job && slot.ready) this.finish(slot, job, error);
    else if (job) {
      // The worker never started, so the job never ran: requeue it, do not fail it.
      slot.job = undefined;
      job.startedAtUtc = job.startedAtMs = undefined;
      this.queued.unshift(job);
      this.version++;
    }
    void slot.worker.terminate().finally(() => {
      this.slots = this.slots.filter((s) => s !== slot);
      if (this.closing || this.degraded) return;
      if (slot.ready) {
        this.spawn();
        this.dispatch();
        return;
      }
      const failures = slot.startFailures + 1;
      if (failures >= START_FAILURE_CAP) return this.park(error, failures);
      // Bounded retry of a failed start, not background work: at most
      // START_FAILURE_CAP - 1 timers per failure streak, then the pool parks.
      const timer = setTimeout(
        () => {
          this.respawns.delete(timer);
          if (this.closing || this.degraded) return;
          this.spawn(failures);
          this.dispatch();
        },
        RESPAWN_BASE_MS * 2 ** (failures - 1)
      );
      this.respawns.add(timer);
    });
  }
  private entryName() {
    return this.entry.protocol === 'file:'
      ? fileURLToPath(this.entry)
      : this.entry.href;
  }
  private park(error: Error, failures: number) {
    for (const timer of this.respawns) clearTimeout(timer);
    this.respawns.clear();
    this.degraded = {
      entry: this.entryName(),
      error: error.message,
      consecutiveStartFailures: failures,
      parkedAtUtc: new Date().toISOString()
    };
    this.version++;
    const rejection = this.degradedError();
    for (const job of [...this.queued]) this.finish(undefined, job, rejection);
  }
  private degradedError() {
    const d = this.degraded!;
    return new StatsServiceError(
      503,
      'Statistics worker pool is degraded: worker entry ' +
        d.entry +
        ' failed to start ' +
        d.consecutiveStartFailures +
        ' consecutive times (last error: ' +
        d.error +
        '); respawning stopped at ' +
        d.parkedAtUtc +
        ' and statistics work is refused. Fix the worker entry, then POST /stats/queue/recover.'
    );
  }
  /** Explicitly leaves the degraded state and starts missing workers again. A no-op for a healthy pool. */
  recover() {
    if (this.degraded && !this.closing) {
      this.degraded = null;
      this.version++;
      for (let i = this.slots.length; i < this.workerCount; i++) this.spawn();
    }
    return this.inspect();
  }
  private dispatch() {
    for (const slot of this.slots) {
      if (slot.job || slot.replacing) continue;
      const job = this.queued.shift();
      if (!job) break;
      slot.job = job;
      job.startedAtUtc = new Date().toISOString();
      job.startedAtMs = Date.now();
      this.version++;
      try {
        slot.worker.postMessage({ jobId: job.jobId, work: job.work });
      } catch (e) {
        this.replace(
          slot,
          e instanceof Error ? e : new Error('Worker dispatch failed')
        );
      }
    }
  }
  enqueue(
    work: StatsWork,
    origin: Origin = 'cold-miss',
    waits = true
  ): Promise<WorkerResult> {
    if (this.closing)
      return Promise.reject(
        new StatsServiceError(503, 'Statistics pool is shutting down')
      );
    if (this.degraded) return Promise.reject(this.degradedError());
    const existing = this.flights.get(work.queryHash);
    if (existing) {
      if (waits) existing.waitingRequestCount++;
      return existing.promise;
    }
    if (
      this.queued.length >= this.capacity &&
      !this.slots.some((s) => !s.job && !s.replacing)
    )
      return Promise.reject(
        new StatsServiceError(503, 'Statistics queue is full')
      );
    let resolve!: (r: WorkerResult) => void, reject!: (e: Error) => void;
    const promise = new Promise<WorkerResult>((a, b) => {
      resolve = a;
      reject = b;
    });
    const job: Job = {
      jobId: randomUUID(),
      origin,
      work,
      enqueuedAtUtc: new Date().toISOString(),
      enqueuedAtMs: Date.now(),
      waitingRequestCount: waits ? 1 : 0,
      resolve,
      reject,
      promise,
      timer: setTimeout(() => this.expire(job), this.timeoutMs)
    };
    this.flights.set(work.queryHash, job);
    this.queued.push(job);
    this.version++;
    this.dispatch();
    return promise;
  }
  private expire(job: Job) {
    const now = Date.now(),
      slot = this.slots.find((s) => s.job === job),
      what = job.work.query.stat + ' for event ' + job.work.query.eventKey,
      deadline =
        'the ' +
        this.timeoutMs +
        ' ms end-to-end deadline (STATS_TIMEOUT_MS, which includes queue wait)';
    if (slot?.ready && job.startedAtMs !== undefined) {
      this.replace(
        slot,
        new StatsServiceError(
          504,
          'Statistics calculation timed out: ' +
            what +
            ' ran ' +
            (now - job.startedAtMs) +
            ' ms on a worker after ' +
            (job.startedAtMs - job.enqueuedAtMs) +
            ' ms of queue wait, exceeding ' +
            deadline +
            '; the worker was terminated.'
        )
      );
      return;
    }
    const position = this.queued.indexOf(job),
      started = this.slots.filter((s) => s.ready && !s.replacing).length,
      busy = this.slots.filter((s) => s.ready && s.job).length;
    this.finish(
      slot,
      job,
      new StatsServiceError(
        504,
        'Statistics job starved: ' +
          what +
          ' never reached a worker - it waited ' +
          (now - job.enqueuedAtMs) +
          ' ms in the queue (' +
          (position >= 0 ? 'position ' + position + ', ' : '') +
          'queue depth ' +
          this.queued.length +
          '; ' +
          busy +
          ' of ' +
          started +
          ' started worker(s) busy, ' +
          this.workerCount +
          ' configured) and exceeded ' +
          deadline +
          '. Add workers (STATS_WORKERS) or reduce queued work.'
      )
    );
  }
  join(hash: string, waits = true) {
    const job = this.flights.get(hash);
    if (job && waits) job.waitingRequestCount++;
    return job?.promise;
  }
  inspect() {
    const safe = (
      j: Job,
      state: 'queued' | 'running',
      position: number | null
    ) => ({
      jobId: j.jobId,
      origin: j.origin,
      state,
      position,
      eventKey: j.work.query.eventKey,
      stat: j.work.query.stat,
      queryHash: j.work.queryHash,
      enqueuedAtUtc: j.enqueuedAtUtc,
      ...(j.startedAtUtc ? { startedAtUtc: j.startedAtUtc } : {}),
      waitingRequestCount: j.waitingRequestCount
    });
    return {
      queueVersion: this.version,
      capacity: this.capacity,
      workerCount: this.workerCount,
      running: this.slots.flatMap((s) =>
        s.job ? [safe(s.job, 'running', null)] : []
      ),
      queued: this.queued.map((j, i) => safe(j, 'queued', i)),
      spawnedWorkers: this.spawnedWorkers,
      degraded: this.degraded
    };
  }
  reorder(expectedQueueVersion: number, orderedJobIds: string[]) {
    if (expectedQueueVersion !== this.version)
      throw new StatsServiceError(409, 'Queue version conflict');
    const ids = new Set(orderedJobIds),
      queuedIds = new Set(this.queued.map((j) => j.jobId));
    if (
      ids.size !== orderedJobIds.length ||
      ids.size !== queuedIds.size ||
      orderedJobIds.some((id) => !queuedIds.has(id))
    )
      throw new StatsServiceError(
        400,
        'Order must include every queued job exactly once and no running or unknown jobs'
      );
    const lookup = new Map(this.queued.map((j) => [j.jobId, j]));
    this.queued = orderedJobIds.map((id) => lookup.get(id)!);
    this.version++;
    return this.inspect();
  }
  async close(graceMs = 5000) {
    if (this.closing) return;
    this.closing = true;
    for (const timer of this.respawns) clearTimeout(timer);
    this.respawns.clear();
    let timeout: NodeJS.Timeout | undefined;
    await Promise.race([
      Promise.allSettled([...this.flights.values()].map((j) => j.promise)),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, graceMs);
      })
    ]);
    if (timeout) clearTimeout(timeout);
    for (const job of [...this.flights.values()])
      this.finish(
        this.slots.find((s) => s.job === job),
        job,
        new StatsServiceError(503, 'Statistics shutdown')
      );
    await Promise.allSettled(
      this.slots.map((s) => {
        s.replacing = true;
        return s.worker.terminate();
      })
    );
    this.slots = [];
  }
}
