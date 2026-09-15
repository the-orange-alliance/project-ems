import {
  playbackStateEnvelopeZod,
  type LiveGraphicState,
  type PlaybackStateEnvelope
} from '@toa-lib/models';
import { atom, type Atom } from 'jotai';
import { eventKeyAtom } from './event.js';

export const createEmptyLiveGraphicState = (): LiveGraphicState => ({
  timelineId: null,
  index: 0,
  spec: null,
  frame: null,
  onAir: false,
  generation: 0,
  queueEntryId: null,
  armed: false,
  values: null,
  previewSpec: null
});

export const graphicsStateMapAtom = atom<Record<string, LiveGraphicState>>({});

/**
 * The most recent preview-replay request per event key, as the monotonic
 * `replayId` the relay issued (see `GraphicsPreviewReplay`). Purely a
 * signal - it holds no graphic and never affects what is on air; only
 * preview (PVW) screens read it.
 *
 * Consumers must treat the value they see on mount as a BASELINE rather
 * than a request, because the socket layer replays an event's last payload
 * to every newly-attached listener (see `event-bus.ts`) - otherwise a
 * preview window would replay its animation every time it is opened or
 * reloaded. `usePreviewReplayNonce` is the hook that gets this right.
 */
export const graphicsPreviewReplayAtom = atom<Record<string, number>>({});

export const liveGraphicStateAtom = atom((get) => {
  const eventKey = get(eventKeyAtom);
  const stateMap = get(graphicsStateMapAtom);

  if (!eventKey) {
    return createEmptyLiveGraphicState();
  }

  return stateMap[eventKey] ?? createEmptyLiveGraphicState();
});

export interface PlaybackEventRecord {
  envelope: PlaybackStateEnvelope;
  /** Epochs superseded for this event; delayed messages from them stay inert. */
  retiredAuthorityEpochs: readonly string[];
}

export type PlaybackDeliveryPhase = 'disconnected' | 'hydrating' | 'ready';

export interface PlaybackDeliveryState {
  phase: PlaybackDeliveryPhase;
  error: string | null;
}

export const playbackEventStoreAtom = atom<Record<string, PlaybackEventRecord>>(
  {}
);
export const playbackDeliveryMapAtom = atom<
  Record<string, PlaybackDeliveryState>
>({});

/** Small stable-key atom cache without the deprecated jotai/utils atomFamily. */
function eventAtomFamily<Value>(
  create: (eventKey: string | null) => Atom<Value>
): (eventKey: string | null) => Atom<Value> {
  const cache = new Map<string | null, Atom<Value>>();
  return (eventKey) => {
    const existing = cache.get(eventKey);
    if (existing) return existing;
    const created = create(eventKey);
    cache.set(eventKey, created);
    return created;
  };
}

export type PlaybackEnvelopeDecision =
  | {
      accepted: true;
      reason: 'first' | 'newer' | 'equal-replay' | 'new-epoch';
      record: PlaybackEventRecord;
    }
  | {
      accepted: false;
      reason: 'invalid' | 'stale' | 'retired-epoch';
      error?: string;
    };

/**
 * Full-snapshot ordering rule: a different non-retired epoch replaces the
 * event atomically; within one epoch greater revisions and equal-revision
 * replays are accepted, while lower revisions are stale.
 */
export function applyPlaybackEnvelope(
  current: PlaybackEventRecord | undefined,
  input: unknown
): PlaybackEnvelopeDecision {
  const parsed = playbackStateEnvelopeZod.safeParse(input);
  if (!parsed.success)
    return {
      accepted: false,
      reason: 'invalid',
      error: parsed.error.message
    };

  const envelope = parsed.data;
  if (!current)
    return {
      accepted: true,
      reason: 'first',
      record: { envelope, retiredAuthorityEpochs: [] }
    };

  if (current.retiredAuthorityEpochs.includes(envelope.authorityEpoch))
    return { accepted: false, reason: 'retired-epoch' };

  if (current.envelope.authorityEpoch !== envelope.authorityEpoch) {
    return {
      accepted: true,
      reason: 'new-epoch',
      record: {
        envelope,
        retiredAuthorityEpochs: [
          ...current.retiredAuthorityEpochs,
          current.envelope.authorityEpoch
        ]
      }
    };
  }

  if (envelope.state.revision < current.envelope.state.revision)
    return { accepted: false, reason: 'stale' };

  return {
    accepted: true,
    reason:
      envelope.state.revision === current.envelope.state.revision
        ? 'equal-replay'
        : 'newer',
    record: { ...current, envelope }
  };
}

const envelopeForEventAtom = eventAtomFamily((eventKey: string | null) =>
  atom((get) =>
    eventKey ? (get(playbackEventStoreAtom)[eventKey]?.envelope ?? null) : null
  )
);

export const playbackEnvelopeForEventAtom = envelopeForEventAtom;
export const playbackStateForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) => get(envelopeForEventAtom(eventKey))?.state ?? null)
);
export const playbackLoadedForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) => get(playbackStateForEventAtom(eventKey))?.loaded ?? null)
);
export const playbackCueForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) => get(playbackStateForEventAtom(eventKey))?.cue ?? null)
);
export const playbackProgramForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) => get(playbackStateForEventAtom(eventKey))?.program ?? null)
);
export const playbackStagedUpdateForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom(
      (get) => get(playbackStateForEventAtom(eventKey))?.stagedUpdate ?? null
    )
);
export const playbackTransitionForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) => get(playbackStateForEventAtom(eventKey))?.transition ?? null)
);
export const playbackErrorsForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) => {
      const state = get(playbackStateForEventAtom(eventKey));
      if (!state) return [];
      return [
        ...(state.cue.status === 'failed' ? [state.cue.error] : []),
        ...(state.stagedUpdate.status === 'failed'
          ? [state.stagedUpdate.error]
          : [])
      ];
    })
);
export const playbackDeliveryForEventAtom = eventAtomFamily(
  (eventKey: string | null) =>
    atom((get) =>
      eventKey
        ? (get(playbackDeliveryMapAtom)[eventKey] ?? {
            phase: 'disconnected' as const,
            error: null
          })
        : { phase: 'disconnected' as const, error: null }
    )
);

export const playbackEnvelopeAtom = atom((get) =>
  get(envelopeForEventAtom(get(eventKeyAtom)))
);
export const playbackStateAtom = atom((get) =>
  get(playbackStateForEventAtom(get(eventKeyAtom)))
);
export const loadedPlaybackAtom = atom((get) =>
  get(playbackLoadedForEventAtom(get(eventKeyAtom)))
);
export const cuePlaybackAtom = atom((get) =>
  get(playbackCueForEventAtom(get(eventKeyAtom)))
);
export const programPlaybackAtom = atom((get) =>
  get(playbackProgramForEventAtom(get(eventKeyAtom)))
);
export const stagedUpdatePlaybackAtom = atom((get) =>
  get(playbackStagedUpdateForEventAtom(get(eventKeyAtom)))
);
export const transitionPlaybackAtom = atom((get) =>
  get(playbackTransitionForEventAtom(get(eventKeyAtom)))
);
export const playbackErrorsAtom = atom((get) =>
  get(playbackErrorsForEventAtom(get(eventKeyAtom)))
);
export const playbackDeliveryAtom = atom((get) =>
  get(playbackDeliveryForEventAtom(get(eventKeyAtom)))
);
