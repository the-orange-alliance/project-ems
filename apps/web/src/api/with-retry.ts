// Default delays between retry attempts. Kept short enough that a late
// success still corrects audience-display state while it's on screen.
const DEFAULT_RETRY_DELAYS_MS = [1000, 3000];

/**
 * Runs fn, retrying transient failures after each delay in delaysMs before
 * rethrowing the last error (total attempts = delaysMs.length + 1).
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  delaysMs: number[] = DEFAULT_RETRY_DELAYS_MS
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= delaysMs.length) throw e;
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
};
