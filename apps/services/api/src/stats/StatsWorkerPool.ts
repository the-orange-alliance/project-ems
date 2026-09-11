import { Worker } from 'node:worker_threads';
import { assertJson } from '@toa-lib/models/seasons/stats';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
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
  startedAtUtc?: string;
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
}
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
export class StatsWorkerPool {
  private slots: Slot[] = [];
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
  private spawn() {
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
    const execArgv = process.execArgv.filter(
      (arg, i, args) =>
        !arg.startsWith('--input-type') &&
        (i === 0 || args[i - 1] !== '--input-type')
    );
    const worker = new Worker(entry, { execArgv }),
      slot: Slot = { worker, replacing: false };
    this.slots.push(slot);
    worker.on(
      'message',
      (message: {
        jobId: string;
        ok: boolean;
        payload?: unknown;
        error?: string;
        statusCode?: number;
      }) => {
        if (!slot.job || message.jobId !== slot.job.jobId || slot.replacing)
          return;
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
          new StatsServiceError(503, 'Statistics worker exited (' + code + ')')
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
    if (slot.job) this.finish(slot, slot.job, error);
    void slot.worker.terminate().finally(() => {
      this.slots = this.slots.filter((s) => s !== slot);
      if (!this.closing) {
        this.spawn();
        this.dispatch();
      }
    });
  }
  private dispatch() {
    for (const slot of this.slots) {
      if (slot.job || slot.replacing) continue;
      const job = this.queued.shift();
      if (!job) break;
      slot.job = job;
      job.startedAtUtc = new Date().toISOString();
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
      waitingRequestCount: waits ? 1 : 0,
      resolve,
      reject,
      promise,
      timer: setTimeout(() => {
        const slot = this.slots.find((s) => s.job === job);
        const error = new StatsServiceError(
          504,
          'Statistics calculation timed out'
        );
        if (slot) this.replace(slot, error);
        else this.finish(undefined, job, error);
      }, this.timeoutMs)
    };
    this.flights.set(work.queryHash, job);
    this.queued.push(job);
    this.version++;
    this.dispatch();
    return promise;
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
      queued: this.queued.map((j, i) => safe(j, 'queued', i))
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
