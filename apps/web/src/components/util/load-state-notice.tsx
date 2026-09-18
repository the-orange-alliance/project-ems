import type { LoadState } from '../../api/load-state.js';

/** Producer/PVW chrome. Never mount this on the PGM output. */
export function LoadStateNotice({
  state,
  retry,
  loadingText
}: {
  state: LoadState<unknown>;
  retry?: () => unknown;
  loadingText?: string;
}) {
  if (state.status === 'ready') return null;
  const failed = state.status === 'error' || state.status === 'unavailable';
  return (
    <div
      role={failed ? 'alert' : 'status'}
      aria-live={failed ? 'assertive' : 'polite'}
      data-requested-identity={state.requestedIdentity}
    >
      <strong>
        {state.status === 'loading'
          ? loadingText || `Loading ${state.source}...`
          : state.status === 'error'
            ? `Unable to load ${state.source}`
            : `${state.source} unavailable`}
      </strong>
      {state.status === 'error' && (
        <div>
          {state.error.kind}: {state.error.message}
        </div>
      )}
      {state.status === 'unavailable' && <div>{state.reason}</div>}
      {failed && retry && (
        <button
          type='button'
          onClick={() => {
            void retry();
          }}
        >
          Retry {state.source}
        </button>
      )}
    </div>
  );
}
