/**
 * Recognises a lost optimistic-concurrency race across the shapes the two
 * error paths deliver it in: `HttpError` (`status`) from the station API's
 * timeline/rundown CRUD, and the relay's verbatim "CODE: reason" envelope
 * (`code`/`message`) from the playback surface. Shared so the timeline editor
 * and the show rundown cannot drift on what a 409 looks like.
 */
export function isRevisionConflict(error: unknown): boolean {
  const candidate = error as
    { status?: unknown; code?: unknown; message?: unknown } | undefined;
  if (candidate?.status === 409) return true;
  if (candidate?.code === 409 || candidate?.code === 'CONFLICT') return true;
  return (
    typeof candidate?.message === 'string' &&
    candidate.message.includes('CONFLICT')
  );
}
