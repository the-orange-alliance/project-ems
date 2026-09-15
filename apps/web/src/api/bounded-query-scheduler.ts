/**
 * One bounded, de-duplicating scheduler for every stat query the producer page
 * fires in the background.
 *
 * WHY IT IS SHARED. The API's stats worker pool defaults to a SINGLE worker
 * thread with a bounded queue (`STATS_WORKERS`/`STATS_QUEUE_CAPACITY` in
 * `StatsWorkerPool.ts`). The browser previously had two independent fan-outs
 * into it: timeline preflight, which capped itself at four in-flight checks
 * precisely so a long timeline could not slam that pool, and On Deck warming,
 * which `Promise.allSettled`-ed EVERY item of a timeline at once and so undid
 * that cap the moment both ran together - which is exactly what happens around
 * a promotion (F10/F22). A per-hook limit cannot bound a page-wide fan-out;
 * one shared scheduler can, and does.
 *
 * WHY IT DE-DUPLICATES. Around a single promotion the same spec is queried by
 * the On Deck warm and by preflight within milliseconds of each other. Keyed
 * by what the query actually is, the second caller joins the first request
 * instead of issuing an identical one - the coalescing is the point, not an
 * optimization: two identical refreshes of the same stat are two cache
 * recomputations the show does not need mid-broadcast.
 *
 * Module-scoped on purpose. Hook instances come and go with renders and tabs;
 * the ceiling has to outlive them or it is not a ceiling.
 */

/**
 * How many background stat queries may be in flight from this page at once.
 *
 * Sized against the server, not the browser: the default pool is one worker
 * deep, so this is "enough to keep it busy and absorb latency", never "as many
 * as the timeline is long". It was already preflight's own limit; sharing it
 * is what makes it hold page-wide.
 */
export const MAX_BACKGROUND_QUERIES = 4;

interface QueuedTask {
  run: () => void;
}

class BoundedQueryScheduler {
  private active = 0;
  private readonly waiting: QueuedTask[] = [];
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Runs `task` when a slot is free, never exceeding {@link MAX_BACKGROUND_QUERIES}
   * concurrently. A call whose `key` matches one already running or queued
   * returns THAT promise and never starts a second request.
   *
   * The returned promise settles exactly as `task` does - a rejection is the
   * caller's to handle (and every caller here does: a failed warm is reported
   * as failed, not swallowed).
   */
  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = new Promise<T>((resolve, reject) => {
      const start = () => {
        this.active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            this.inFlight.delete(key);
            this.pump();
          });
      };
      if (this.active < MAX_BACKGROUND_QUERIES) start();
      else this.waiting.push({ run: start });
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  private pump(): void {
    while (this.active < MAX_BACKGROUND_QUERIES && this.waiting.length > 0) {
      this.waiting.shift()!.run();
    }
  }

  /** In-flight + queued task count. For tests and diagnostics only. */
  get pending(): number {
    return this.active + this.waiting.length;
  }
  /** Currently executing task count - never above {@link MAX_BACKGROUND_QUERIES}. For tests and diagnostics only. */
  get running(): number {
    return this.active;
  }
}

export const backgroundQueries = new BoundedQueryScheduler();

/**
 * Stable identity of "this exact query": the same string for two callers means
 * running it twice would produce the same cache effect, so they may share one
 * request. `refresh` is part of the key - a warm (which forces recomputation)
 * must never be satisfied by an in-flight prediction read, or the warm would
 * report success without having warmed anything.
 */
export function statQueryKey(
  eventKey: string,
  query: unknown,
  refresh: boolean
): string {
  return `${eventKey}|${refresh ? 'refresh' : 'read'}|${JSON.stringify(query)}`;
}
