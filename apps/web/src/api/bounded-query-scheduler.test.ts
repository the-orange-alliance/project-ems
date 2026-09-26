import { describe, expect, it } from 'vitest';
import {
  MAX_BACKGROUND_QUERIES,
  backgroundQueries,
  statQueryKey
} from './bounded-query-scheduler.js';

/** A task that only settles when the test says so, and reports when it started. */
function gate() {
  let release!: (value: string) => void;
  let fail!: (error: unknown) => void;
  const promise = new Promise<string>((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  return { promise, release, fail };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('backgroundQueries', () => {
  it('never runs more than the ceiling at once, however much work is queued', async () => {
    const gates = Array.from({ length: MAX_BACKGROUND_QUERIES + 6 }, gate);
    let started = 0;
    let peak = 0;
    let running = 0;

    const all = gates.map((g, index) =>
      backgroundQueries.run(`ceiling-${index}`, () => {
        started += 1;
        running += 1;
        peak = Math.max(peak, running);
        return g.promise.finally(() => {
          running -= 1;
        });
      })
    );

    await flush();
    // Exactly the ceiling started; the rest are waiting for a slot.
    expect(started).toBe(MAX_BACKGROUND_QUERIES);
    expect(backgroundQueries.running).toBe(MAX_BACKGROUND_QUERIES);

    // Draining one at a time must never let a second slot open up.
    for (const g of gates) {
      g.release('done');
      await flush();
      expect(backgroundQueries.running).toBeLessThanOrEqual(
        MAX_BACKGROUND_QUERIES
      );
    }
    await Promise.all(all);

    expect(started).toBe(gates.length);
    expect(peak).toBe(MAX_BACKGROUND_QUERIES);
    expect(backgroundQueries.pending).toBe(0);
  });

  it('coalesces identical requests instead of issuing them twice', async () => {
    const g = gate();
    let invocations = 0;
    const task = () => {
      invocations += 1;
      return g.promise;
    };

    const a = backgroundQueries.run('coalesce-key', task);
    const b = backgroundQueries.run('coalesce-key', task);
    // A third caller arriving while it is still in flight joins the same work.
    const c = backgroundQueries.run('coalesce-key', task);
    g.release('shared');

    expect(await Promise.all([a, b, c])).toEqual([
      'shared',
      'shared',
      'shared'
    ]);
    expect(invocations).toBe(1);
  });

  it('does not let a warm be satisfied by an in-flight prediction read of the same spec', () => {
    // `refresh` forces recomputation; a read does not. Sharing one request
    // between them would report a warm that never warmed anything.
    const query = { stat: 'score', selectors: {} };
    expect(statQueryKey('event-a', query, true)).not.toBe(
      statQueryKey('event-a', query, false)
    );
    // ...and the same query for two events is never shared either.
    expect(statQueryKey('event-a', query, true)).not.toBe(
      statQueryKey('event-b', query, true)
    );
  });

  it('releases the key after a failure so the work can be retried', async () => {
    const first = gate();
    let invocations = 0;
    const failing = backgroundQueries.run('retry-key', () => {
      invocations += 1;
      return first.promise;
    });
    first.fail(new Error('boom'));
    await expect(failing).rejects.toThrow('boom');

    const second = await backgroundQueries.run('retry-key', () => {
      invocations += 1;
      return Promise.resolve('recovered');
    });
    expect(second).toBe('recovered');
    expect(invocations).toBe(2);
  });
});
