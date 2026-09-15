import type {
  GraphicSpec,
  GraphicsTransition,
  PlaybackStateEnvelope,
  PresentationMode,
  VizFrame
} from '@toa-lib/models';

/** Framework-free decisions. All timestamps share the caller's clock; no timers or wall-clock reads. */
export interface TransitionTiming {
  crossfadeMs: number;
  exitMs: number;
  gapMs: number;
  enterMs: number;
}
export const DEFAULT_CROSSFADE_MS = 300;
export const CROSS_MODE_GAP_MS = 250;
export const REPLAY_CUT_HOLD_MS = 400;
export function defaultTimingForMode(mode: PresentationMode): TransitionTiming {
  const duration = mode === 'fullscreen' ? 500 : 1250;
  return {
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    exitMs: duration,
    gapMs: CROSS_MODE_GAP_MS,
    enterMs: duration
  };
}
export function resolveTiming(
  from: PresentationMode | null,
  to: PresentationMode | null,
  override?: Partial<TransitionTiming>
): TransitionTiming {
  return {
    crossfadeMs: override?.crossfadeMs ?? DEFAULT_CROSSFADE_MS,
    exitMs:
      override?.exitMs ??
      defaultTimingForMode(from ?? to ?? 'fullscreen').exitMs,
    gapMs: override?.gapMs ?? CROSS_MODE_GAP_MS,
    enterMs:
      override?.enterMs ??
      defaultTimingForMode(to ?? from ?? 'fullscreen').enterMs
  };
}
export function withReducedMotion(timing: TransitionTiming): TransitionTiming {
  return { ...timing, crossfadeMs: 0, exitMs: 0, enterMs: 0 };
}

export interface GraphicSnapshot {
  spec: GraphicSpec;
  frame: VizFrame;
}
export interface TransitionAuthority {
  authorityEpoch: string;
  revision: number;
  programRevision: number | null;
  transition: GraphicsTransition | null;
}
export function programTransitionAuthority(
  envelope: PlaybackStateEnvelope | null
): TransitionAuthority | undefined {
  return envelope
    ? {
        authorityEpoch: `${envelope.eventKey}:${envelope.authorityEpoch}`,
        revision: envelope.state.revision,
        programRevision: envelope.state.program?.revision ?? null,
        transition: envelope.state.transition
      }
    : undefined;
}

interface CommitIdentity {
  revision: number;
  authorityEpoch?: string;
  /** Full durable render identity, distinct from state revisions for cue/queue changes. */
  renderIdentity?: string;
  transition?: GraphicsTransition | null;
  effectiveAtMs?: number;
  timingOverride?: Partial<TransitionTiming>;
  preview?: boolean;
  replayNonce?: number;
  replayFrom?: GraphicSnapshot | null;
}
export type TransitionCommit = CommitIdentity &
  ({ spec: null; frame: null } | { spec: GraphicSpec; frame: VizFrame });
export type NonEmptyCommit = Extract<TransitionCommit, { spec: GraphicSpec }>;

/** Canonical JSON identity includes configuration, data and provenance, regardless of object key order. */
export function renderContentIdentity(
  spec: GraphicSpec | null,
  frame: VizFrame | null
): string {
  return JSON.stringify([spec, frame], (_key, value: unknown) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const object = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(object)
          .sort()
          .map((key) => [key, object[key]])
      );
    }
    return value;
  });
}
export function createTransitionCommit(
  spec: GraphicSpec | null,
  frame: VizFrame | null,
  authority?: TransitionAuthority,
  preview = false,
  replayNonce = 0,
  replayFrom: GraphicSnapshot | null = null
): TransitionCommit {
  const snapshot =
    spec && frame ? { spec, frame } : { spec: null, frame: null };
  const content = renderContentIdentity(snapshot.spec, snapshot.frame);
  return {
    ...snapshot,
    revision: authority?.revision ?? 0,
    authorityEpoch:
      authority?.authorityEpoch ?? (preview ? 'preview' : 'local'),
    renderIdentity: JSON.stringify([
      authority?.programRevision ?? null,
      content
    ]),
    transition: authority?.transition,
    preview,
    replayNonce,
    replayFrom
  };
}
export function renderKey(commit: TransitionCommit): string {
  return JSON.stringify([
    commit.authorityEpoch ?? 'local',
    commit.renderIdentity ?? [
      commit.revision,
      renderContentIdentity(commit.spec, commit.frame)
    ],
    commit.preview ? (commit.replayNonce ?? 0) : 0
  ]);
}

export type TransitionPhase =
  'idle' | 'entering' | 'shown' | 'exiting' | 'holding';
export type Schedule =
  | { kind: 'idle' }
  | { kind: 'settled'; commit: NonEmptyCommit }
  | {
      kind: 'enter-only';
      commit: NonEmptyCommit;
      startMs: number;
      enterMs: number;
    }
  | {
      kind: 'exit-only';
      commit: NonEmptyCommit;
      startMs: number;
      exitMs: number;
    }
  | {
      kind: 'crossfade';
      from: NonEmptyCommit;
      to: NonEmptyCommit;
      startMs: number;
      crossfadeMs: number;
    }
  | {
      kind: 'cross-mode';
      from: NonEmptyCommit;
      to: NonEmptyCommit;
      startMs: number;
      exitMs: number;
      gapMs: number;
      enterMs: number;
    }
  /** The wire contract has no outgoing snapshot: observe its windows without inventing content. */
  | {
      kind: 'late-join';
      to: NonEmptyCommit | null;
      startMs: number;
      timing: TransitionTiming;
    }
  | {
      kind: 'pending';
      before: NonEmptyCommit | null;
      startMs: number;
      next: Schedule;
    }
  | {
      kind: 'replay';
      before: NonEmptyCommit | null;
      startMs: number;
      next: Schedule;
    };

export interface MachineState {
  activeRevision: number | null;
  activeEpoch?: string;
  retiredEpochs?: readonly string[];
  accepted?: TransitionCommit;
  schedule: Schedule;
}
export const initialMachineState: MachineState = {
  activeRevision: null,
  schedule: { kind: 'idle' }
};

export function activeCommitAt(
  schedule: Schedule,
  nowMs: number
): NonEmptyCommit | null {
  switch (schedule.kind) {
    case 'idle':
      return null;
    case 'settled':
      return schedule.commit;
    case 'enter-only':
      return schedule.commit;
    case 'exit-only':
      return nowMs < schedule.startMs + schedule.exitMs
        ? schedule.commit
        : null;
    case 'crossfade':
      return schedule.to;
    case 'cross-mode':
      if (nowMs < schedule.startMs + schedule.exitMs) return schedule.from;
      if (nowMs < schedule.startMs + schedule.exitMs + schedule.gapMs)
        return null;
      return schedule.to;
    case 'late-join':
      return nowMs < schedule.startMs + joinEntranceOffset(schedule.timing)
        ? null
        : schedule.to;
    case 'pending':
    case 'replay':
      return nowMs < schedule.startMs
        ? schedule.before
        : activeCommitAt(schedule.next, nowMs);
  }
}
function joinEntranceOffset(timing: TransitionTiming): number {
  return timing.exitMs > 0 && timing.enterMs > 0
    ? timing.exitMs + timing.gapMs
    : timing.exitMs;
}
function plan(
  from: NonEmptyCommit | null,
  to: NonEmptyCommit | null,
  startMs: number,
  timing: TransitionTiming
): Schedule {
  if (!to)
    return from
      ? { kind: 'exit-only', commit: from, startMs, exitMs: timing.exitMs }
      : { kind: 'idle' };
  if (!from)
    return { kind: 'enter-only', commit: to, startMs, enterMs: timing.enterMs };
  if (from.spec.mode === to.spec.mode)
    return {
      kind: 'crossfade',
      from,
      to,
      startMs,
      crossfadeMs: timing.crossfadeMs
    };
  return {
    kind: 'cross-mode',
    from,
    to,
    startMs,
    exitMs: timing.exitMs,
    gapMs: timing.gapMs,
    enterMs: timing.enterMs
  };
}

/** New events supersede from the snapshot visible at receipt, never from an unseen target. */
export function commit(
  state: MachineState,
  next: TransitionCommit,
  nowMs: number
): MachineState {
  const epoch = next.authorityEpoch ?? 'local';
  if (state.retiredEpochs?.includes(epoch)) return state;
  const newEpoch =
    state.activeEpoch !== undefined && state.activeEpoch !== epoch;
  if (
    !newEpoch &&
    state.activeRevision !== null &&
    next.revision < state.activeRevision
  )
    return state;
  const previous = state.accepted;
  const replay =
    !newEpoch &&
    previous !== undefined &&
    next.preview === true &&
    previous.preview === true &&
    (next.replayNonce ?? 0) !== (previous.replayNonce ?? 0) &&
    next.spec !== null;
  const unchanged =
    previous &&
    renderKey({ ...next, replayNonce: 0 }) ===
      renderKey({ ...previous, replayNonce: 0 }) &&
    JSON.stringify(next.transition) === JSON.stringify(previous.transition);
  if (!newEpoch && !replay && unchanged) {
    return next.revision === state.activeRevision
      ? state
      : { ...state, activeRevision: next.revision, accepted: next };
  }
  const first = state.activeRevision === null || newEpoch;
  const from = first ? null : activeCommitAt(state.schedule, nowMs);
  const to = next.spec === null ? null : next;
  const timing = resolveTiming(
    from?.spec.mode ?? null,
    to?.spec.mode ?? null,
    next.transition ?? next.timingOverride
  );
  const effective = next.transition
    ? Date.parse(next.transition.effectiveAtUtc)
    : next.effectiveAtMs;
  const startMs =
    effective !== undefined && Number.isFinite(effective) ? effective : nowMs;
  let schedule: Schedule;
  if (replay) {
    const before: NonEmptyCommit | null = next.replayFrom
      ? {
          revision: next.revision,
          ...next.replayFrom,
          authorityEpoch: epoch,
          renderIdentity: renderContentIdentity(
            next.replayFrom.spec,
            next.replayFrom.frame
          ),
          preview: true,
          replayNonce: next.replayNonce
        }
      : null;
    // PVW previews the coordinator's mode policy, independent of any old PGM effective time.
    const replayTiming = resolveTiming(
      before?.spec.mode ?? null,
      to?.spec.mode ?? null
    );
    schedule = {
      kind: 'replay',
      before,
      startMs: nowMs + REPLAY_CUT_HOLD_MS,
      next: plan(before, to, nowMs + REPLAY_CUT_HOLD_MS, replayTiming)
    };
  } else if (first && next.transition) {
    schedule = { kind: 'late-join', to, startMs, timing };
  } else if (first && effective === undefined) {
    schedule = to ? { kind: 'settled', commit: to } : { kind: 'idle' };
  } else {
    schedule = plan(from, to, startMs, timing);
  }
  if (!replay && startMs > nowMs)
    schedule = { kind: 'pending', before: from, startMs, next: schedule };
  // A completed plan retains only its current snapshot, bounding memory across supersessions.
  const sampled = deriveVisual(schedule, nowMs);
  if (sampled.nextWakeAtMs === null) {
    const current = activeCommitAt(schedule, nowMs);
    schedule = current
      ? { kind: 'settled', commit: current }
      : { kind: 'idle' };
  }
  return {
    activeRevision: next.revision,
    activeEpoch: epoch,
    accepted: next,
    retiredEpochs: newEpoch
      ? [...(state.retiredEpochs ?? []), state.activeEpoch!]
      : state.retiredEpochs,
    schedule
  };
}

export interface ContentLayer extends GraphicSnapshot {
  role: 'enter' | 'exit';
  revision: number;
  key: string;
}
export interface Motion {
  kind: 'enter' | 'exit' | 'crossfade';
  startMs: number;
  durationMs: number;
}
export interface VisualState {
  phase: TransitionPhase;
  layers: ContentLayer[];
  containerMode: PresentationMode | null;
  containerIn: boolean;
  chrome: { title?: string; subtitle?: string } | null;
  nextWakeAtMs: number | null;
  containerMotion: Motion | null;
  contentMotion: Motion | null;
  cutting: boolean;
}
function visual(
  phase: TransitionPhase,
  commits: { commit: NonEmptyCommit; role: 'enter' | 'exit' }[],
  wake: number | null,
  containerMotion: Motion | null = null,
  contentMotion: Motion | null = null,
  cutting = false
): VisualState {
  const current = commits[commits.length - 1]?.commit;
  return {
    phase,
    layers: commits.map(({ commit: c, role }) => ({
      role,
      revision: c.revision,
      key: renderKey(c),
      spec: c.spec,
      frame: c.frame
    })),
    containerMode: current?.spec.mode ?? null,
    containerIn: phase === 'shown' || phase === 'entering',
    chrome: current
      ? { title: current.spec.title, subtitle: current.spec.subtitle }
      : null,
    nextWakeAtMs: wake,
    containerMotion,
    contentMotion,
    cutting
  };
}
export function deriveVisual(schedule: Schedule, nowMs: number): VisualState {
  const one = (c: NonEmptyCommit, role: 'enter' | 'exit' = 'enter') => [
    { commit: c, role }
  ];
  switch (schedule.kind) {
    case 'idle':
      return visual('idle', [], null);
    case 'settled':
      return visual('shown', one(schedule.commit), null);
    case 'enter-only': {
      const end = schedule.startMs + schedule.enterMs;
      return nowMs >= end
        ? visual('shown', one(schedule.commit), null)
        : visual('entering', one(schedule.commit), end, {
            kind: 'enter',
            startMs: schedule.startMs,
            durationMs: schedule.enterMs
          });
    }
    case 'exit-only': {
      const end = schedule.startMs + schedule.exitMs;
      return nowMs >= end
        ? visual('idle', [], null)
        : visual('exiting', one(schedule.commit, 'exit'), end, {
            kind: 'exit',
            startMs: schedule.startMs,
            durationMs: schedule.exitMs
          });
    }
    case 'crossfade': {
      const end = schedule.startMs + schedule.crossfadeMs;
      return nowMs >= end
        ? visual('shown', one(schedule.to), null)
        : visual(
            'entering',
            [...one(schedule.from, 'exit'), ...one(schedule.to)],
            end,
            null,
            {
              kind: 'crossfade',
              startMs: schedule.startMs,
              durationMs: schedule.crossfadeMs
            }
          );
    }
    case 'cross-mode': {
      const exitEnd = schedule.startMs + schedule.exitMs;
      const enterStart = exitEnd + schedule.gapMs;
      if (nowMs < exitEnd)
        return visual('exiting', one(schedule.from, 'exit'), exitEnd, {
          kind: 'exit',
          startMs: schedule.startMs,
          durationMs: schedule.exitMs
        });
      if (nowMs < enterStart) return visual('holding', [], enterStart);
      return deriveVisual(
        {
          kind: 'enter-only',
          commit: schedule.to,
          startMs: enterStart,
          enterMs: schedule.enterMs
        },
        nowMs
      );
    }
    case 'late-join': {
      const offset = joinEntranceOffset(schedule.timing);
      const enterStart = schedule.startMs + offset;
      if (nowMs < schedule.startMs + schedule.timing.exitMs)
        return visual('exiting', [], schedule.startMs + schedule.timing.exitMs);
      if (nowMs < enterStart) return visual('holding', [], enterStart);
      if (!schedule.to) return visual('idle', [], null);
      // Same-mode late join has only its incoming layer; sample its dissolve without an invented outgoing layer.
      if (schedule.timing.crossfadeMs > 0) {
        const end = schedule.startMs + schedule.timing.crossfadeMs;
        return nowMs >= end
          ? visual('shown', one(schedule.to), null)
          : visual('entering', one(schedule.to), end, null, {
              kind: 'crossfade',
              startMs: schedule.startMs,
              durationMs: schedule.timing.crossfadeMs
            });
      }
      return deriveVisual(
        {
          kind: 'enter-only',
          commit: schedule.to,
          startMs: enterStart,
          enterMs: schedule.timing.enterMs
        },
        nowMs
      );
    }
    case 'pending':
    case 'replay':
      if (nowMs >= schedule.startMs) return deriveVisual(schedule.next, nowMs);
      return visual(
        schedule.before ? 'shown' : 'idle',
        schedule.before ? one(schedule.before) : [],
        schedule.startMs,
        null,
        null,
        schedule.kind === 'replay'
      );
  }
}
