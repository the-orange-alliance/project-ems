import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type {
  GraphicSpec,
  GraphicsTransition,
  PresentationMode,
  VizFrame
} from '@toa-lib/models';
import { describe, expect, it, vi } from 'vitest';
import {
  activeCommitAt,
  commit,
  createTransitionCommit,
  deriveVisual,
  initialMachineState,
  programTransitionAuthority,
  renderKey,
  resolveTiming,
  useGraphicTransition,
  REPLAY_CUT_HOLD_MS,
  type MachineState,
  type TransitionCommit
} from './transition-engine.js';

const spec = (
  id = 'A',
  mode: PresentationMode = 'fullscreen'
): GraphicSpec => ({
  id,
  mode,
  kind: 'stat-tile',
  title: id,
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  options: {}
});
const frame = (title = 'score'): VizFrame => ({
  kind: 'stat-tile',
  title,
  series: [],
  quality: 'complete',
  warnings: [],
  asOfUtc: '2026-09-15T00:00:00Z'
});
const timing = (
  revision: number,
  at: number,
  values: Partial<GraphicsTransition> = {}
): GraphicsTransition => ({
  revision,
  effectiveAtUtc: new Date(at).toISOString(),
  crossfadeMs: 0,
  exitMs: 0,
  gapMs: 250,
  enterMs: 500,
  ...values
});
function input(
  revision: number,
  mode: PresentationMode | null = 'fullscreen',
  transition?: GraphicsTransition,
  epoch = 'epoch',
  id = String(revision)
): TransitionCommit {
  const snapshot = mode
    ? { spec: spec(id, mode), frame: frame() }
    : { spec: null, frame: null };
  return { ...snapshot, revision, authorityEpoch: epoch, transition };
}
const shown = (mode: PresentationMode = 'fullscreen') =>
  commit(initialMachineState, input(1, mode), 0);
const sample = (m: MachineState, at: number) => deriveVisual(m.schedule, at);

describe('production-exported transition decisions', () => {
  it.each([
    [
      'enter',
      null,
      'fullscreen',
      { exitMs: 0, enterMs: 500 },
      [
        [0, 'entering'],
        [499, 'entering'],
        [500, 'shown']
      ]
    ],
    [
      'same mode',
      'fullscreen',
      'fullscreen',
      { crossfadeMs: 300, enterMs: 0 },
      [
        [0, 'entering'],
        [299, 'entering'],
        [300, 'shown']
      ]
    ],
    [
      'cross mode',
      'fullscreen',
      'drawer-left',
      { exitMs: 500, enterMs: 1250 },
      [
        [0, 'exiting'],
        [499, 'exiting'],
        [500, 'holding'],
        [749, 'holding'],
        [750, 'entering'],
        [1999, 'entering'],
        [2000, 'shown']
      ]
    ],
    [
      'clear',
      'drawer-left',
      null,
      { exitMs: 1250, enterMs: 0 },
      [
        [0, 'exiting'],
        [1249, 'exiting'],
        [1250, 'idle']
      ]
    ],
    ['empty', null, null, { enterMs: 0 }, [[0, 'idle']]]
  ] as const)(
    '%s samples every exact deadline',
    (_name, from, to, durations, cases) => {
      const base = from
        ? shown(from)
        : commit(initialMachineState, input(1, null), 0);
      const m = commit(base, input(2, to, timing(2, 1000, durations)), 1000);
      for (const [offset, phase] of cases) {
        const v = sample(m, 1000 + offset);
        expect(v.phase).toBe(phase);
        expect(v.nextWakeAtMs === null || v.nextWakeAtMs > 1000 + offset).toBe(
          true
        );
        if (phase === 'holding' || phase === 'idle')
          expect(v.layers).toHaveLength(0);
      }
    }
  );

  it.each([
    ['idle', null, 0],
    ['shown', 'shown', 1000],
    ['entrance', 'enter', 100],
    ['exit', 'cross', 1100],
    ['gap', 'cross', 1500],
    ['cross entrance', 'cross', 1800],
    ['dissolve', 'fade', 1100]
  ] as const)(
    'state/event table: %s accepts same-mode, cross-mode, and clear events',
    (_name, setup, at) => {
      let base =
        setup === null
          ? commit(initialMachineState, input(1, null), 0)
          : shown();
      if (setup === 'enter')
        base = commit(
          initialMachineState,
          input(2, 'fullscreen', timing(2, 0)),
          0
        );
      if (setup === 'cross')
        base = commit(
          base,
          input(
            2,
            'drawer-left',
            timing(2, 1000, { exitMs: 500, enterMs: 1250 })
          ),
          1000
        );
      if (setup === 'fade')
        base = commit(
          base,
          input(
            2,
            'fullscreen',
            timing(2, 1000, { crossfadeMs: 300, enterMs: 0 })
          ),
          1000
        );
      const visible = activeCommitAt(base.schedule, at);
      for (const to of [
        visible?.spec.mode ?? 'fullscreen',
        'lower-third',
        null
      ] as const) {
        const next = commit(
          base,
          input(
            3,
            to,
            timing(3, at, { crossfadeMs: 300, exitMs: 500, enterMs: 1250 })
          ),
          at
        );
        if (!to) {
          expect(sample(next, at).layers.map((l) => l.spec.id)).toEqual(
            visible ? [visible.spec.id] : []
          );
          expect(sample(next, at + 500).phase).toBe('idle');
        } else {
          if (visible && visible.spec.mode === to) {
            expect(sample(next, at).layers).toHaveLength(2);
            expect(sample(next, at).containerMotion).toBeNull();
          } else if (visible) {
            expect(sample(next, at).layers[0].spec.id).toBe(visible.spec.id);
            expect(sample(next, at).phase).toBe('exiting');
          } else expect(sample(next, at).phase).toBe('entering');
          expect(sample(next, at + 3000).layers.map((l) => l.spec.id)).toEqual([
            '3'
          ]);
        }
      }
    }
  );
  it.each([0, 100, 499, 500, 749, 750, 1000, 1999, 2000, 100_000])(
    'late cross-mode join at %i uses effective time',
    (at) => {
      const m = commit(
        initialMachineState,
        input(2, 'drawer-left', timing(2, 0, { exitMs: 500, enterMs: 1250 })),
        at
      );
      const v = sample(m, at);
      expect(v.phase).toBe(
        at < 500
          ? 'exiting'
          : at < 750
            ? 'holding'
            : at < 2000
              ? 'entering'
              : 'shown'
      );
      expect(v.layers).toHaveLength(at < 750 ? 0 : 1);
      if (v.containerMotion)
        expect(v.containerMotion).toEqual({
          kind: 'enter',
          startMs: 750,
          durationMs: 1250
        });
    }
  );
  it.each([0, 100, 499, 500, 60000])(
    'late entrance join at %i never restarts its clock',
    (at) => {
      const m = commit(
        initialMachineState,
        input(1, 'fullscreen', timing(1, 0)),
        at
      );
      expect(sample(m, at).phase).toBe(at < 500 ? 'entering' : 'shown');
      expect(sample(m, 500).nextWakeAtMs).toBeNull();
    }
  );
  it.each([0, 299, 300])(
    'late same-mode dissolve at %i retains only known incoming content',
    (at) => {
      const m = commit(
        initialMachineState,
        input(2, 'fullscreen', timing(2, 0, { crossfadeMs: 300, enterMs: 0 })),
        at
      );
      expect(sample(m, at).layers).toHaveLength(1);
      expect(sample(m, at).phase).toBe(at < 300 ? 'entering' : 'shown');
      expect(sample(m, at).containerMotion).toBeNull();
    }
  );
  it.each([0, 499, 500])(
    'late clear at %i stays transparent without inventing an outgoing snapshot',
    (at) => {
      const m = commit(
        initialMachineState,
        input(2, null, timing(2, 0, { exitMs: 500, enterMs: 0 })),
        at
      );
      expect(sample(m, at).layers).toHaveLength(0);
      expect(sample(m, at).phase).toBe(at < 500 ? 'exiting' : 'idle');
    }
  );
  it('delayed delivery samples past completion immediately and does not resurrect a completed clear', () => {
    let m = commit(
      shown(),
      input(2, null, timing(2, 1000, { exitMs: 500, enterMs: 0 })),
      2000
    );
    expect(activeCommitAt(m.schedule, 2000)).toBeNull();
    m = commit(m, input(3, 'fullscreen', timing(3, 2100)), 2100);
    expect(m.schedule.kind).toBe('enter-only');
  });
  it('future effective time holds the current snapshot until the start deadline', () => {
    const m = commit(
      shown(),
      input(2, 'fullscreen', timing(2, 1000, { crossfadeMs: 300, enterMs: 0 })),
      500
    );
    expect(sample(m, 999).layers[0].spec.id).toBe('1');
    expect(sample(m, 999).nextWakeAtMs).toBe(1000);
    expect(sample(m, 1000).layers).toHaveLength(2);
  });

  it.each([1100, 1500, 1750, 1900, 3000])(
    'interrupted cross-mode revision at %i starts from what is visible',
    (at) => {
      const m = commit(
        shown(),
        input(
          2,
          'drawer-left',
          timing(2, 1000, { exitMs: 500, enterMs: 1250 })
        ),
        1000
      );
      const next = commit(
        m,
        input(3, 'lower-third', timing(3, at, { exitMs: 1250, enterMs: 1250 })),
        at
      );
      const visible = at < 1500 ? '1' : at < 1750 ? null : '2';
      expect(activeCommitAt(m.schedule, at)?.spec.id ?? null).toBe(visible);
      if (visible) expect(sample(next, at).layers[0].spec.id).toBe(visible);
      else expect(next.schedule.kind).toBe('enter-only');
      expect(sample(next, at + 5000).layers.map((l) => l.spec.id)).toEqual([
        '3'
      ]);
    }
  );
  it.each([1100, 1500, 1750, 1900])(
    'clear during exit/gap/enter at %i exits the displayed snapshot',
    (at) => {
      const m = commit(
        shown(),
        input(
          2,
          'drawer-left',
          timing(2, 1000, { exitMs: 500, enterMs: 1250 })
        ),
        1000
      );
      const cleared = commit(
        m,
        input(3, null, timing(3, at, { exitMs: 1250, enterMs: 0 })),
        at
      );
      const visible = at < 1500 ? '1' : at < 1750 ? null : '2';
      expect(sample(cleared, at).layers.map((l) => l.spec.id)).toEqual(
        visible ? [visible] : []
      );
      expect(sample(cleared, at + 1250).phase).toBe('idle');
    }
  );
  it('same-mode interruption and clear preserve the newest displayed content', () => {
    const m = commit(
      shown(),
      input(2, 'fullscreen', timing(2, 1000, { crossfadeMs: 300, enterMs: 0 })),
      1000
    );
    const cleared = commit(
      m,
      input(3, null, timing(3, 1100, { exitMs: 500, enterMs: 0 })),
      1100
    );
    expect(sample(cleared, 1100).layers[0].spec.id).toBe('2');
  });
  it.each(['spec', 'frame'] as const)(
    'same timestamp and authored id with changed %s gets a recovery key',
    (field) => {
      const first = input(1);
      const m = commit(initialMachineState, first, 0);
      const changed = {
        ...first,
        [field]: { ...first[field], title: 'corrected' }
      } as TransitionCommit;
      const corrected = commit(m, changed, 1000);
      expect(corrected).not.toBe(m);
      expect(sample(corrected, 1300).layers[0][field].title).toBe('corrected');
      expect(renderKey(changed)).not.toBe(renderKey(first));
    }
  );
  it('equal revision socket replay is inert, while a new epoch can reuse revision numbers', () => {
    const m = shown();
    expect(commit(m, JSON.parse(JSON.stringify(m.accepted)), 10)).toBe(m);
    const restarted = commit(
      m,
      input(1, 'drawer-right', undefined, 'new-epoch'),
      10
    );
    expect(sample(restarted, 10).phase).toBe('shown');
    expect(renderKey(restarted.accepted!)).not.toBe(renderKey(m.accepted!));
    expect(
      commit(restarted, input(99, 'fullscreen', undefined, 'epoch'), 20)
    ).toBe(restarted);
    expect(commit(m, input(0), 20)).toBe(m);
  });
  it('cue/queue revisions do not restart an unchanged program or churn its render key', () => {
    const a = createTransitionCommit(spec(), frame(), {
      authorityEpoch: 'epoch',
      revision: 2,
      programRevision: 1,
      transition: timing(1, 0)
    });
    const m = commit(initialMachineState, a, 100);
    const b = { ...a, revision: 3 };
    const next = commit(m, b, 200);
    expect(next.schedule).toBe(m.schedule);
    expect(renderKey(a)).toBe(renderKey(b));
    expect(next.activeRevision).toBe(3);
  });
  it.each([null, 'fullscreen', 'drawer-left'] as const)(
    'PVW replay from %s holds a cut for exactly 400ms then previews mode policy',
    (mode) => {
      const a = { ...input(1), preview: true, replayNonce: 4 };
      const m = commit(initialMachineState, a, 0);
      const replayed = commit(
        m,
        {
          ...a,
          replayNonce: 5,
          replayFrom: mode ? { spec: spec('PGM', mode), frame: frame() } : null
        },
        1000
      );
      expect(sample(replayed, 1399).cutting).toBe(true);
      expect(sample(replayed, 1400).cutting).toBe(false);
      expect(sample(replayed, 1400).phase).toBe(
        mode === 'drawer-left' ? 'exiting' : 'entering'
      );
      expect(sample(replayed, 5000).layers[0].key).not.toBe(
        sample(m, 0).layers[0].key
      );
    }
  );
  it('PGM ignores replay nonce and replay source entirely', () => {
    const m = shown();
    expect(
      commit(
        m,
        {
          ...m.accepted!,
          replayNonce: 4,
          replayFrom: { spec: spec('X', 'drawer-right'), frame: frame() }
        },
        20
      )
    ).toBe(m);
  });
  it('canonical full content ignores JSON object insertion order', () => {
    const a = createTransitionCommit(spec(), frame());
    const b = createTransitionCommit(
      { ...spec(), options: { limit: 2, precision: 1 } },
      frame()
    );
    const c = createTransitionCommit(
      { ...spec(), options: { precision: 1, limit: 2 } },
      frame()
    );
    expect(renderKey(b)).toBe(renderKey(c));
    expect(renderKey(a)).not.toBe(renderKey(c));
  });
  it('program authority uses envelope epoch, state ordering, and program identity separately', () => {
    const authority = programTransitionAuthority({
      eventKey: 'event',
      authorityEpoch: 'writer',
      state: { revision: 9, program: { revision: 4 }, transition: timing(4, 0) }
    } as Parameters<typeof programTransitionAuthority>[0]);
    expect(authority).toMatchObject({
      authorityEpoch: 'event:writer',
      revision: 9,
      programRevision: 4
    });
    expect(resolveTiming('fullscreen', 'drawer-left')).toEqual({
      crossfadeMs: 300,
      exitMs: 500,
      gapMs: 250,
      enterMs: 1250
    });
  });
});

describe('production React deadline adapter', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StrictMode>{children}</StrictMode>
  );
  it('StrictMode double effects retain one timer and clean it on unmount', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100);
    const authority = {
      authorityEpoch: 'epoch',
      revision: 1,
      programRevision: 1,
      transition: timing(1, 0)
    };
    const { result, unmount } = renderHook(
      () => useGraphicTransition(spec(), frame(), 0, null, authority),
      { wrapper }
    );
    expect(result.current.phase).toBe('entering');
    expect(result.current.containerMotion?.startMs).toBe(0);
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(399));
    expect(result.current.phase).toBe('entering');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.phase).toBe('shown');
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rapid clear/take cancels obsolete deadlines and preserves the outgoing snapshot', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const s = spec();
    const f = frame();
    const { result, rerender, unmount } = renderHook(
      ({ revision, clear }: { revision: number; clear: boolean }) =>
        useGraphicTransition(clear ? null : s, clear ? null : f, 0, null, {
          authorityEpoch: 'epoch',
          revision,
          programRevision: clear ? null : revision,
          transition: timing(
            revision,
            ({ 1: 1000, 2: 1100, 3: 1200, 4: 1700 } as Record<number, number>)[
              revision
            ],
            clear
              ? { exitMs: 500, enterMs: 0 }
              : revision === 3
                ? { crossfadeMs: 300, enterMs: 0 }
                : { enterMs: 500 }
          )
        }),
      { initialProps: { revision: 1, clear: false }, wrapper }
    );
    act(() => vi.advanceTimersByTime(100));
    rerender({ revision: 2, clear: true });
    expect(result.current.phase).toBe('exiting');
    expect(result.current.displayedSpec).toBe(s);
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(100));
    rerender({ revision: 3, clear: false });
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.phase).toBe('shown');
    expect(result.current.layers[0].revision).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
    rerender({ revision: 4, clear: true });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(10000));
    expect(vi.getTimerCount()).toBe(0);
  });
});
