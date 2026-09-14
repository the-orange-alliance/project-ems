import type { GraphicSpec } from '@toa-lib/models';
import useSWR from 'swr';
import {
  queryGraphicFrame,
  type GraphicFrameOutcome,
  type GraphicFrameResult
} from 'src/api/graphic-frame-query.js';
import { useMatchesForEvent } from 'src/api/use-match-data.js';
import { useStatsCatalogue } from 'src/api/use-stats-data.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';

/**
 * Calculates the frame for the preview (PVW-bus) screen's graphic.
 *
 * The server hands a preview client the NEXT item's spec only, never a
 * frame: the playback coordinator calculates the cue lane and nothing else
 * (GRAPHICS_PLAYBACK_POLICY.navigation: 'prepare-cue-only'), so the item one
 * step ahead of the program is by definition unprepared. Rather than adding a
 * second server-side calculation to the on-air path just to feed a monitor,
 * this off-air surface runs the query itself - through the exact same
 * `queryGraphicFrame` round trip and the same `prepareGraphicFrame` adapter
 * the producer's own Cue/Quick Stat path uses, so the preview is a faithful
 * render rather than an approximation.
 *
 * Re-queries whenever the previewed item changes - which is precisely when
 * the show advances - and never polls: the program itself only recalculates
 * on an explicit producer refresh, and a PVW monitor has no business
 * generating background load on the stats service mid-show.
 *
 * Returns the RESOLVED spec alongside its frame (never the raw input spec),
 * so the two always describe the same graphic. `stats-graphic-display.tsx`'s
 * transition engine depends on `spec`/`frame` moving in lockstep.
 */
export interface PreviewFrameState {
  /** The calculated graphic, or `null` when there is nothing to show (or it could not be calculated). */
  result: GraphicFrameResult | null;
  /**
   * Why the NEXT cue cannot be calculated, when it cannot be.
   *
   * This is the same `{ ok: false }` outcome `PlaybackNavigation.prepareCueAt`
   * will hit when the transport advances onto this item - at which point it
   * writes `cue.status = 'failed'` and the following `take` rejects
   * `NOT_READY`. In other words: a non-null `failure` here means the next Go
   * WILL NOT put anything on air. It used to be discarded (the hook returned a
   * bare `null`, indistinguishable from "nothing is queued next"), which is
   * exactly why that failure could only ever be discovered by pressing the
   * button.
   */
  failure: { reason: string } | null;
}

export const usePreviewFrame = (
  eventKey: string | null | undefined,
  spec: GraphicSpec | null
): PreviewFrameState => {
  const { data: catalogue = [] } = useStatsCatalogue(eventKey);
  const { data: teams = [] } = useTeamsForEvent(eventKey);
  const { data: matches = [] } = useMatchesForEvent(eventKey);

  // The catalogue is a hard prerequisite - `queryGraphicFrame` throws on an
  // unrecognized `spec.stat` - so there is nothing to ask for until it
  // arrives. `teams`/`matches` only supply display labels and alliance
  // grouping, so their counts ride along in the key purely as a cheap
  // "the entity lookups have arrived" signal: when they land, the frame is
  // recalculated once with real labels instead of bare team keys.
  const { data } = useSWR<
    GraphicFrameOutcome,
    Error,
    readonly [string, string, string, number, number] | null
  >(
    eventKey && spec && catalogue.length > 0
      ? [
          'graphics-preview-frame',
          eventKey,
          JSON.stringify(spec),
          teams.length,
          matches.length
        ]
      : null,
    async ([, key, serializedSpec]) =>
      // The WHOLE outcome is cached, failure included. A "cannot compute
      // this" result (an unfilled template binding, insufficient data) still
      // renders no GRAPHIC - this remains a transparent broadcast source and
      // must never paint a placeholder where a graphic would go - but the
      // reason is now kept so the preview chrome can raise an alarm about the
      // next cue. Collapsing it to `null` here was what made a broken next
      // cue indistinguishable from an empty one.
      queryGraphicFrame(key, JSON.parse(serializedSpec) as GraphicSpec, {
        // `values: {}` is correct, not an oversight: `previewSpec` comes from
        // the loaded snapshot's items, whose bindings `buildItems` already
        // resolved at LOAD time against the load's own values. A binding still
        // present here is one the server could not resolve either - so this
        // item genuinely will fail, and reporting that is the point.
        refresh: false,
        values: {},
        context: { catalogue, teams, matches }
      }),
    {
      revalidateOnFocus: false,
      /**
       * MUST stay true, and is load-bearing for the ANIMATION, not just for
       * perceived latency.
       *
       * Without it SWR blanks `data` to `undefined` while a new key is in
       * flight, so moving between two items handed the display
       * `graphic -> null -> graphic`. The transition engine reads that as
       * two separate changes - a clear (exit) followed by an arrival
       * (enter) - so two sequential drawers, which must simply crossfade
       * their contents, instead animated the drawer out and back in. It
       * only misbehaved on a cache MISS (a cache hit fills `data`
       * synchronously and leaves no gap), which is exactly why it looked
       * intermittent.
       *
       * Holding the previous frame until the next one resolves collapses
       * that into the single `graphic -> graphic` change the engine needs
       * to choose a content crossfade.
       */
      keepPreviousData: true,
      // Never retry forever against a stat that is genuinely erroring.
      shouldRetryOnError: false
    }
  );

  // `keepPreviousData` deliberately outlives the key going null, so the
  // end of the running order (no next item at all) has to be honoured here
  // explicitly - otherwise the last previewed graphic would linger on the
  // PVW screen forever instead of clearing. The alarm clears with it: no next
  // item is not a broken next item.
  if (!spec) return { result: null, failure: null };
  if (!data) return { result: null, failure: null };
  return data.ok
    ? { result: data.result, failure: null }
    : { result: null, failure: { reason: data.unavailable.reason } };
};
