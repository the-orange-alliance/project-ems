import { z } from 'zod';
import {
  jsonSchema,
  selectorsSchema,
  filtersSchema,
  type Json,
  type StatsQuery
} from '../seasons/stats/types.js';

export type GraphicKind =
  | 'stat-tile'
  | 'bar'
  | 'grouped-bar'
  | 'line'
  | 'histogram'
  | 'ranking-table'
  | 'heatmap'
  | 'geo-map'
  | 'table';

export const graphicKindZod = z.enum([
  'stat-tile',
  'bar',
  'grouped-bar',
  'line',
  'histogram',
  'ranking-table',
  'heatmap',
  'geo-map',
  'table'
]);

export type PresentationMode =
  'fullscreen' | 'drawer-left' | 'drawer-right' | 'lower-third';

export const presentationModeZod = z.enum([
  'fullscreen',
  'drawer-left',
  'drawer-right',
  'lower-third'
]);

export const graphicIdentifierZod = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const graphicRevisionZod = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const utcTimestampZod = z.iso.datetime({ offset: true });
const finiteValueZod = z.number().finite().nullable();

export const measureFormatZod = z
  .object({
    precision: z.number().int().min(0).max(12).optional(),
    unit: z.string().max(40).optional(),
    style: z.enum(['number', 'percent', 'duration', 'text']).default('number'),
    /** Multiply stored ratios by 100 only when scale is explicitly 100. */
    scale: z.number().finite().positive().default(1)
  })
  .strict();
export type MeasureFormat = z.infer<typeof measureFormatZod>;

const measureZod = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    format: measureFormatZod
  })
  .strict();
/**
 * Which alliance an entity/row belongs to - populated ONLY by
 * `createSemanticFrame`'s `applyAllianceGroups` post-process (see
 * `semantic-helpers.ts`), and ONLY when the graphic's `teamsInMatchId`
 * selector was used to source its team list. Absent otherwise: a plain
 * `teamKey` selection or an event-wide "all teams" leaderboard carries no
 * group at all, so a renderer must treat `undefined` as "no alliance
 * grouping applies here" rather than defaulting to either color.
 */
const allianceGroupZod = z.enum(['red', 'blue']);
export type AllianceGroup = z.infer<typeof allianceGroupZod>;
const entityZod = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    group: allianceGroupZod.optional()
  })
  .strict();
const typedCellZod = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null()
]);
const categoricalSeriesZod = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    measure: measureZod,
    points: z.array(
      z.object({ entityId: z.string().min(1), value: finiteValueZod }).strict()
    )
  })
  .strict();
const tableDataShape = {
  columns: z.array(
    measureZod.extend({ align: z.enum(['left', 'right']).optional() })
  ),
  rows: z.array(
    z
      .object({
        id: z.string().min(1),
        label: z.string(),
        rank: z.number().int().positive().optional(),
        group: allianceGroupZod.optional(),
        cells: z.record(z.string(), typedCellZod)
      })
      .strict()
  )
};

/** Semantic payload consumed by v2 renderers; legacy series remain a migration bridge. */
export const presentationDataZod = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('stat-tile'),
      values: z.array(
        z
          .object({
            id: z.string().min(1),
            label: z.string(),
            value: typedCellZod,
            format: measureFormatZod
          })
          .strict()
      )
    })
    .strict(),
  z
    .object({
      kind: z.literal('bar'),
      entities: z.array(entityZod),
      series: z.array(categoricalSeriesZod)
    })
    .strict(),
  z
    .object({
      kind: z.literal('grouped-bar'),
      entities: z.array(entityZod),
      series: z.array(categoricalSeriesZod)
    })
    .strict(),
  z
    .object({
      kind: z.literal('line'),
      xType: z.enum(['number', 'timestamp']),
      xLabel: z.string().optional(),
      series: z.array(
        z
          .object({
            id: z.string().min(1),
            label: z.string(),
            measure: measureZod,
            interpolation: z.enum(['linear', 'step']).default('linear'),
            points: z.array(
              z
                .object({
                  x: z.number().finite(),
                  label: z.string().optional(),
                  value: finiteValueZod
                })
                .strict()
            )
          })
          .strict()
      )
    })
    .strict(),
  z
    .object({
      kind: z.literal('histogram'),
      measure: measureZod,
      bins: z.array(
        z
          .object({
            id: z.string().min(1),
            label: z.string(),
            lower: finiteValueZod,
            upper: finiteValueZod,
            value: finiteValueZod
          })
          .strict()
          .refine(
            (bin) =>
              bin.lower === null ||
              bin.upper === null ||
              bin.lower <= bin.upper,
            'Histogram lower bound must not exceed upper bound'
          )
      )
    })
    .strict(),
  z.object({ kind: z.literal('table'), ...tableDataShape }).strict(),
  z.object({ kind: z.literal('ranking-table'), ...tableDataShape }).strict(),
  z
    .object({
      kind: z.literal('heatmap'),
      xEntities: z.array(entityZod),
      yEntities: z.array(entityZod),
      measure: measureZod,
      domain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
      center: z.number().finite().optional(),
      cells: z.array(
        z
          .object({
            xId: z.string().min(1),
            yId: z.string().min(1),
            value: finiteValueZod
          })
          .strict()
      )
    })
    .strict(),
  z
    .object({
      kind: z.literal('geo-map'),
      geography: z.literal('country'),
      measure: measureZod,
      countries: z.array(
        z
          .object({
            countryCode: z.string().regex(/^[A-Z]{2}$/),
            label: z.string(),
            value: finiteValueZod
          })
          .strict()
      ),
      unknownCountryCodes: z.array(z.string()).default([])
    })
    .strict()
]);
export type PresentationData = z.infer<typeof presentationDataZod>;

export interface VizFrame {
  schemaVersion?: 2;
  data?: PresentationData;
  emptyReason?: string;
  kind: GraphicKind;
  title: string;
  subtitle?: string;
  asOfUtc: string;
  quality: 'complete' | 'best_effort' | 'degraded';
  warnings: string[];
  series: {
    name?: string;
    points: { label: string; value: number | null; meta?: Json }[];
  }[];
  axis?: {
    xLabel?: string;
    yLabel?: string;
    xType?: 'category' | 'value' | 'time';
  };
  columns?: { key: string; label: string; align?: 'left' | 'right' }[];
  rows?: Record<string, Json>[];
  notes?: string[];
}

export const vizFrameZod = z
  .object({
    schemaVersion: z.literal(2).optional(),
    data: presentationDataZod.optional(),
    emptyReason: z.string().min(1).optional(),
    kind: graphicKindZod,
    title: z.string(),
    subtitle: z.string().optional(),
    asOfUtc: z.string(),
    quality: z.enum(['complete', 'best_effort', 'degraded']),
    warnings: z.array(z.string()),
    series: z.array(
      z
        .object({
          name: z.string().optional(),
          points: z.array(
            z
              .object({
                label: z.string(),
                value: z.number().nullable(),
                meta: jsonSchema.optional()
              })
              .strict()
          )
        })
        .strict()
    ),
    axis: z
      .object({
        xLabel: z.string().optional(),
        yLabel: z.string().optional(),
        xType: z.enum(['category', 'value', 'time']).optional()
      })
      .strict()
      .optional(),
    columns: z
      .array(
        z
          .object({
            key: z.string(),
            label: z.string(),
            align: z.enum(['left', 'right']).optional()
          })
          .strict()
      )
      .optional(),
    rows: z.array(z.record(z.string(), jsonSchema)).optional(),
    notes: z.array(z.string()).optional()
  })
  .strict();

export interface GraphicSpec {
  id: string;
  title: string;
  subtitle?: string;
  stat: string;
  selectors: StatsQuery['selectors'];
  /** Maps a selector key to the NAME of a timeline template variable; stripped during resolution before any stats query. */
  bindings?: {
    teamKey?: string;
    matchId?: string;
    allianceSeed?: string;
    teamsInMatchId?: string;
  };
  filters: StatsQuery['filters'];
  params: Record<string, Json>;
  kind: GraphicKind;
  mode: PresentationMode;
  options: {
    limit?: number;
    sortDir?: 'asc' | 'desc';
    valuePath?: string;
    precision?: number;
    showTeamNames?: boolean;
  };
  /** Page dwell for an auto-paging table, in ms. Governs nothing unless `autoPage` is true. */
  holdMs?: number;
  /**
   * Explicit producer opt-in to timed table paging; absent/false means an
   * overflowing table stays on its first page. Pages derive from the
   * program's authoritative `takenAtUtc`, so every display agrees.
   */
  autoPage?: boolean;
}

export const graphicSpecZod = z
  .object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    stat: z.string(),
    selectors: selectorsSchema,
    bindings: z
      .object({
        teamKey: z.string().optional(),
        matchId: z.string().optional(),
        allianceSeed: z.string().optional(),
        teamsInMatchId: z.string().optional()
      })
      .strict()
      .optional(),
    filters: filtersSchema,
    params: z.record(z.string(), jsonSchema),
    kind: graphicKindZod,
    mode: presentationModeZod,
    options: z.object({
      limit: z.number().int().min(1).max(10000).optional(),
      sortDir: z.enum(['asc', 'desc']).optional(),
      valuePath: z.string().optional(),
      precision: z.number().int().min(0).max(12).optional(),
      showTeamNames: z.boolean().optional()
    }),
    holdMs: z.number().int().min(0).max(86400000).optional(),
    autoPage: z.boolean().optional()
  })
  .strict();

export type TemplateVariableKind = 'team' | 'match' | 'alliance';
export interface TemplateVariable {
  name: string;
  kind: TemplateVariableKind;
  label?: string;
}
export const templateVariableZod = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    kind: z.enum(['team', 'match', 'alliance']),
    label: z.string().max(200).optional()
  })
  .strict();

export interface Timeline {
  timelineId: string;
  eventKey: string;
  name: string;
  description?: string;
  items: GraphicSpec[];
  variables?: TemplateVariable[];
  /** Gates visibility in the timeline queue's search-to-add picker (see `GET /timelines?published=`) - absent/false means unpublished. Purely a producer-facing switch; unrelated to what is on-air. */
  published?: boolean;
  updatedAtUtc: string;
}

export const timelineZod = z
  .object({
    timelineId: z.string(),
    eventKey: z.string(),
    name: z.string(),
    description: z.string().optional(),
    items: z.array(graphicSpecZod),
    variables: z.array(templateVariableZod).optional(),
    published: z.boolean().optional(),
    updatedAtUtc: z.string()
  })
  .strict();

export enum GraphicsSocketEvent {
  /** Schema-versioned, event-scoped authoritative playback envelope. */
  PLAYBACK_STATE_V1 = 'graphics:playback-state:v1',
  /**
   * The relay could not read the authoritative envelope for a subscribe -
   * see `playbackHydrationErrorZod`. Sent ONLY to the socket that asked.
   */
  PLAYBACK_HYDRATION_ERROR_V1 = 'graphics:playback-hydration-error:v1',
  /** Asks preview (PVW) screens to re-run their entrance animation - see `graphicsPreviewReplayZod`. */
  PREVIEW_REPLAY = 'graphics:preview-replay'
}

/**
 * Why a subscribing client is NOT getting an authoritative envelope.
 *
 * Replay is the client's only hydration path, and its failure used to be
 * silent: the relay logged a warning, emitted nothing, and the browser sat
 * in `hydrating` with every transport control disabled until someone
 * reloaded the page. This carries the relay's own reason back to the one
 * socket that asked, so the operator is told which of the three genuinely
 * different failures happened - the API is unreachable, the API rejected
 * the read, or the API answered with something that is not a valid
 * envelope - rather than being left to infer it from silence.
 *
 * Deliberately NOT a state message: it carries no `PlaybackState`, bumps no
 * revision, has no authority epoch, and must never influence envelope
 * ordering. It is a diagnosis, and it is never broadcast to a room - an
 * audience screen must not learn about it (PGM stays fail-closed and
 * renders nothing).
 *
 * `retryable` distinguishes "the authority may come back on its own"
 * (unreachable/5xx) from a rejection that will answer the same way until
 * something changes; clients use it to decide whether to keep retrying.
 */
export interface PlaybackHydrationError {
  eventKey: string;
  /** Upstream code when the API named one (`UNAVAILABLE`, `NOT_READY`, ...). */
  code?: string;
  /** The upstream reason, verbatim - never a generic substitute. */
  message: string;
  retryable: boolean;
}

export const playbackHydrationErrorZod = z
  .object({
    eventKey: z.string().min(1),
    code: z.string().min(1).optional(),
    message: z.string().min(1),
    retryable: z.boolean()
  })
  .strict();

/**
 * A request for every preview (PVW) screen on an event to replay its
 * entrance animation, so a producer can watch how the next graphic will
 * animate in before committing it to air.
 *
 * Purely presentational and entirely ephemeral: it carries no graphic, bumps
 * no revision, is never persisted, and MUST never reach the program bus -
 * what is on air is untouched. That is why it is broadcast directly by the
 * realtime relay rather than going through the playback coordinator like
 * every state-changing command does.
 *
 * `replayId` is a monotonic token (epoch milliseconds), not a flag, for two
 * reasons: the socket layer replays the last payload of an event to every
 * newly-attached listener (see `event-bus.ts`), so a receiver needs to tell
 * "a replay was requested just now" from "this is the backlog I got on
 * mount"; and it lets a receiver drop an out-of-order redelivery, exactly
 * as authority epochs and revisions do for state broadcasts.
 */
export interface GraphicsPreviewReplay {
  eventKey: string;
  replayId: number;
}

export const graphicsPreviewReplayZod = z
  .object({
    eventKey: z.string().min(1),
    replayId: z.number().int().positive()
  })
  .strict();

export const GRAPHICS_SCHEMA_VERSION = 2 as const;
export const SUPPORTED_GRAPHIC_MODES: Readonly<
  Record<GraphicKind, readonly PresentationMode[]>
> = {
  'stat-tile': ['fullscreen', 'drawer-left', 'drawer-right', 'lower-third'],
  bar: ['fullscreen', 'drawer-left', 'drawer-right'],
  'grouped-bar': ['fullscreen', 'drawer-left', 'drawer-right'],
  line: ['fullscreen', 'drawer-left', 'drawer-right'],
  histogram: ['fullscreen', 'drawer-left', 'drawer-right'],
  'ranking-table': ['fullscreen', 'drawer-left', 'drawer-right'],
  heatmap: ['fullscreen', 'drawer-left', 'drawer-right'],
  'geo-map': ['fullscreen', 'drawer-left', 'drawer-right'],
  table: ['fullscreen', 'drawer-left', 'drawer-right']
};
export const preparedGraphicSpecZod = graphicSpecZod
  .extend({
    id: graphicIdentifierZod,
    stat: z.string().min(1).max(150),
    title: z.string().max(500),
    subtitle: z.string().max(1000).optional()
  })
  .refine((spec) => SUPPORTED_GRAPHIC_MODES[spec.kind].includes(spec.mode), {
    message: 'Unsupported graphic kind and presentation mode',
    path: ['mode']
  })
  .refine((spec) => !spec.bindings || Object.keys(spec.bindings).length === 0, {
    message: 'Template bindings must be resolved before preparing a graphic',
    path: ['bindings']
  });
export const presentationFrameZod = vizFrameZod
  .extend({
    schemaVersion: z.literal(2),
    data: presentationDataZod,
    asOfUtc: utcTimestampZod
  })
  .refine((frame) => frame.kind === frame.data.kind, {
    message: 'Frame kind must match semantic payload kind',
    path: ['data', 'kind']
  })
  .superRefine((frame, ctx) => {
    const { data } = frame;
    const fail = (message: string) =>
      ctx.addIssue({ code: 'custom', message, path: ['data'] });
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    let count = 0;
    switch (data.kind) {
      case 'stat-tile':
        count = data.values.length;
        if (!unique(data.values.map((value) => value.id)))
          fail('Value IDs must be unique');
        break;
      case 'bar':
      case 'grouped-bar': {
        count = data.series.reduce(
          (sum, series) => sum + series.points.length,
          0
        );
        const domain = new Set(data.entities.map((entity) => entity.id));
        if (
          domain.size !== data.entities.length ||
          !unique(data.series.map((series) => series.id))
        )
          fail('Entity and series IDs must be unique');
        for (const series of data.series) {
          if (
            !unique(series.points.map((point) => point.entityId)) ||
            series.points.some((point) => !domain.has(point.entityId))
          )
            fail(
              'Categorical points must reference unique entities in the shared domain'
            );
        }
        break;
      }
      case 'line':
        count = data.series.reduce(
          (sum, series) => sum + series.points.length,
          0
        );
        if (!unique(data.series.map((series) => series.id)))
          fail('Series IDs must be unique');
        for (const series of data.series) {
          if (
            series.points.some(
              (point, index) =>
                index > 0 && point.x < series.points[index - 1].x
            )
          )
            fail('Line coordinates must be chronologically ordered');
        }
        break;
      case 'histogram':
        count = data.bins.length;
        if (!unique(data.bins.map((bin) => bin.id)))
          fail('Histogram bin IDs must be unique');
        break;
      case 'table':
      case 'ranking-table': {
        count = data.rows.length;
        const columns = new Set(data.columns.map((column) => column.id));
        if (
          columns.size !== data.columns.length ||
          !unique(data.rows.map((row) => row.id))
        )
          fail('Table column and row IDs must be unique');
        if (
          data.rows.some((row) =>
            Object.keys(row.cells).some((key) => !columns.has(key))
          )
        )
          fail('Table cells must reference declared columns');
        if (
          data.kind === 'ranking-table' &&
          data.rows.some((row) => row.rank === undefined)
        )
          fail('Ranking rows require authoritative ranks');
        break;
      }
      case 'heatmap': {
        count = data.cells.length;
        const xIds = new Set(data.xEntities.map((entity) => entity.id));
        const yIds = new Set(data.yEntities.map((entity) => entity.id));
        if (
          xIds.size !== data.xEntities.length ||
          yIds.size !== data.yEntities.length
        )
          fail('Heatmap entity IDs must be unique');
        if (
          data.cells.some((cell) => !xIds.has(cell.xId) || !yIds.has(cell.yId))
        )
          fail('Heatmap cells must reference declared entities');
        if (
          !unique(
            data.cells.map((cell) => JSON.stringify([cell.xId, cell.yId]))
          )
        )
          fail('Heatmap coordinates must be unique');
        if (data.domain && data.domain[0] >= data.domain[1])
          fail('Heatmap domain must increase');
        break;
      }
      case 'geo-map':
        count = data.countries.length;
        if (!unique(data.countries.map((country) => country.countryCode)))
          fail('Countries must be aggregated to unique codes');
        break;
    }
    if (count === 0 && !frame.emptyReason)
      fail('An empty semantic result requires an explicit emptyReason');
  });
export type PresentationFrame = z.infer<typeof presentationFrameZod>;
export const versionedTimelineZod = timelineZod.extend({
  schemaVersion: z.literal(2),
  revision: graphicRevisionZod,
  timelineId: graphicIdentifierZod,
  eventKey: graphicIdentifierZod,
  updatedAtUtc: utcTimestampZod
});
export type VersionedTimeline = z.infer<typeof versionedTimelineZod>;
/** Explicit compatibility boundary. Invalid/corrupt records throw; content is never discarded. */
export function migrateTimeline(input: unknown): VersionedTimeline {
  if (input && typeof input === 'object' && 'schemaVersion' in input) {
    return versionedTimelineZod.parse(input);
  }
  return versionedTimelineZod.parse({
    ...timelineZod.parse(input),
    schemaVersion: 2,
    revision: 0
  });
}
/**
 * The durable ordered show: the single model that owns what the producer runs,
 * in order, with which per-entry template values. It supersedes the parallel
 * `CueQueue` document (see `GraphicsShow.ts` for the invariants, the producer
 * show's well-known id, and the entry-status derivation both the API and the
 * producer app share).
 *
 * An entry's `timelineId` is deliberately NOT validated against the event's
 * timelines at write time: a deleted timeline must leave an explicit, fixable
 * entry behind rather than blocking every subsequent reorder or removal.
 */
export const rundownBaseZod = z
  .object({
    schemaVersion: z.literal(2),
    revision: graphicRevisionZod,
    rundownId: graphicIdentifierZod,
    eventKey: graphicIdentifierZod,
    name: z.string().min(1).max(500),
    entries: z.array(
      z
        .object({
          entryId: graphicIdentifierZod,
          timelineId: graphicIdentifierZod,
          values: z
            .record(z.string().min(1), z.number().int().positive())
            .optional(),
          note: z.string().max(500).optional()
        })
        .strict()
    ),
    updatedAtUtc: utcTimestampZod
  })
  .strict();
export const rundownZod = rundownBaseZod.refine(
  (rundown) =>
    new Set(rundown.entries.map((entry) => entry.entryId)).size ===
    rundown.entries.length,
  'Rundown entry IDs must be unique'
);
export type Rundown = z.infer<typeof rundownZod>;

export const loadedGraphicsSnapshotZod = z
  .object({
    snapshotId: graphicIdentifierZod,
    source: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('timeline'),
          timelineId: graphicIdentifierZod,
          revision: graphicRevisionZod
        })
        .strict(),
      z
        .object({
          kind: z.literal('rundown'),
          rundownId: graphicIdentifierZod,
          revision: graphicRevisionZod
        })
        .strict()
    ]),
    /** Ordered deep copies, never resolved from mutable editor state during navigation. */
    timelines: z.array(versionedTimelineZod),
    items: z.array(
      z
        .object({
          timelineId: graphicIdentifierZod,
          timelineRevision: graphicRevisionZod,
          entryId: graphicIdentifierZod.optional(),
          itemIndex: z.number().int().nonnegative(),
          spec: graphicSpecZod
        })
        .strict()
    ),
    index: z.number().int().nonnegative(),
    loadedAtUtc: utcTimestampZod,
    /**
     * The variable-name -> value map a `source.kind === 'timeline'` load used
     * to resolve this snapshot's items' template bindings (see `buildItems`'s
     * Deviation 2 doc comment) - omitted for an untemplated timeline and for
     * `source.kind === 'rundown'` snapshots, where each item already carries
     * its own resolved values via its rundown entry instead of one shared map.
     * Persisted here (not just baked into the already-resolved item specs) so
     * a later `load` of the SAME timeline - e.g. the producer editing and
     * saving the timeline that is currently cued to the transport, which
     * reloads it to pick up the edit - can default back to these values
     * instead of dropping them and reloading every bound item `failed`
     * ("Fill in: <name>").
     */
    values: z.record(z.string().min(1), z.number().int().positive()).optional()
  })
  .strict()
  .refine(
    (snapshot) =>
      snapshot.items.length > 0 && snapshot.index < snapshot.items.length,
    'Loaded snapshot requires a valid item index'
  );
export type LoadedGraphicsSnapshot = z.infer<typeof loadedGraphicsSnapshotZod>;

export const graphicsErrorZod = z
  .object({
    code: z.enum([
      'INVALID_INPUT',
      'NOT_FOUND',
      'CONFLICT',
      'NOT_READY',
      'SUPERSEDED',
      'CALCULATION_FAILED',
      'PRESENTATION_FAILED',
      'CORRUPT_DATA',
      'UNAVAILABLE',
      'INTERRUPTED'
    ]),
    message: z.string().min(1),
    retryable: z.boolean(),
    details: jsonSchema.optional()
  })
  .strict();
export type GraphicsError = z.infer<typeof graphicsErrorZod>;
export const graphicsTargetZod = z
  .object({
    targetId: graphicIdentifierZod,
    targetRevision: graphicRevisionZod,
    requestId: graphicIdentifierZod,
    snapshotId: graphicIdentifierZod.nullable(),
    index: z.number().int().nonnegative().nullable()
  })
  .strict()
  .refine(
    (target) => (target.snapshotId === null) === (target.index === null),
    'Snapshot ID and index must either both be present or both be null'
  );
export type GraphicsTarget = z.infer<typeof graphicsTargetZod>;
const preparedFields = {
  target: graphicsTargetZod,
  spec: preparedGraphicSpecZod,
  frame: presentationFrameZod,
  preparedAtUtc: utcTimestampZod
};
export const preparedGraphicZod = z
  .object(preparedFields)
  .strict()
  .refine((graphic) => graphic.spec.kind === graphic.frame.kind, {
    message: 'Prepared spec and frame kind must match',
    path: ['frame', 'kind']
  });
export type PreparedGraphic = z.infer<typeof preparedGraphicZod>;
/** Use at cue/program/update boundaries: validation alone need not detach shared references. */
export function snapshotPreparedGraphic(
  graphic: PreparedGraphic
): PreparedGraphic {
  return preparedGraphicZod.parse(JSON.parse(JSON.stringify(graphic)));
}
export const graphicsCueZod = z.discriminatedUnion('status', [
  z.object({ status: z.literal('empty') }).strict(),
  z
    .object({
      status: z.literal('calculating'),
      target: graphicsTargetZod,
      spec: preparedGraphicSpecZod
    })
    .strict(),
  z
    .object({ status: z.literal('ready'), graphic: preparedGraphicZod })
    .strict(),
  z
    .object({
      status: z.literal('failed'),
      target: graphicsTargetZod,
      spec: graphicSpecZod,
      error: graphicsErrorZod
    })
    .strict()
]);
export type GraphicsCue = z.infer<typeof graphicsCueZod>;
/**
 * Human-readable, EXACT reason a cue is not ready to `take`/`refresh` — one
 * message per possible `GraphicsCue.status`, so a `NOT_READY` rejection
 * tells the operator precisely what's wrong instead of a bare
 * `(status: calculating)`/`(status: failed)` suffix.
 *
 * A `'failed'` cue is the one case that isn't really "not ready" so much as
 * "ready, and it's a rejection" — its own captured `error` (the actual
 * calculation/presentation failure, e.g. a missing template binding or a
 * stat query that came back `insufficient_data`) IS the exact reason, so
 * that `code`/`message` is propagated verbatim rather than replaced with a
 * generic `NOT_READY`.
 */
export function describeCueNotReady(cue: GraphicsCue): {
  code: GraphicsError['code'];
  message: string;
} {
  switch (cue.status) {
    case 'empty':
      return {
        code: 'NOT_READY',
        message: 'The cue is empty; nothing has been loaded or cued yet.'
      };
    case 'calculating':
      return {
        code: 'NOT_READY',
        message: 'The cue is still calculating its data; try again in a moment.'
      };
    case 'failed':
      return { code: cue.error.code, message: cue.error.message };
    case 'ready':
      // Never actually reached by a real "not ready" rejection — callers
      // only invoke this after confirming `status !== 'ready'` — but every
      // status must produce a message so a future caller can't skip that
      // check and get `undefined`.
      return {
        code: 'NOT_READY',
        message: 'The cue is ready.'
      };
  }
}
export const graphicsTransitionZod = z
  .object({
    revision: graphicRevisionZod,
    effectiveAtUtc: utcTimestampZod,
    crossfadeMs: z.number().int().min(0).max(5000),
    exitMs: z.number().int().min(0).max(5000),
    gapMs: z.literal(250),
    enterMs: z.number().int().min(0).max(5000)
  })
  .strict();
export type GraphicsTransition = z.infer<typeof graphicsTransitionZod>;
export const graphicsProgramZod = z
  .object({
    revision: graphicRevisionZod,
    graphic: preparedGraphicZod,
    takenAtUtc: utcTimestampZod
  })
  .strict();
export type GraphicsProgram = z.infer<typeof graphicsProgramZod>;
export const graphicsStagedUpdateZod = z.discriminatedUnion('status', [
  z.object({ status: z.literal('empty') }).strict(),
  z
    .object({
      status: z.literal('calculating'),
      destination: z.enum(['cue', 'program']),
      origin: graphicsTargetZod,
      requestId: graphicIdentifierZod
    })
    .strict(),
  z
    .object({
      status: z.literal('ready'),
      destination: z.enum(['cue', 'program']),
      origin: graphicsTargetZod,
      graphic: preparedGraphicZod
    })
    .strict(),
  z
    .object({
      status: z.literal('failed'),
      destination: z.enum(['cue', 'program']),
      origin: graphicsTargetZod,
      requestId: graphicIdentifierZod,
      error: graphicsErrorZod
    })
    .strict()
]);
export type GraphicsStagedUpdate = z.infer<typeof graphicsStagedUpdateZod>;
/** `describeCueNotReady`'s sibling for a `GraphicsStagedUpdate` (see that doc comment) — same four statuses, same reasoning. */
export function describeStagedUpdateNotReady(staged: GraphicsStagedUpdate): {
  code: GraphicsError['code'];
  message: string;
} {
  switch (staged.status) {
    case 'empty':
      return {
        code: 'NOT_READY',
        message: 'There is no staged update; nothing has been refreshed yet.'
      };
    case 'calculating':
      return {
        code: 'NOT_READY',
        message:
          'The staged update is still calculating its data; try again in a moment.'
      };
    case 'failed':
      return { code: staged.error.code, message: staged.error.message };
    case 'ready':
      return { code: 'NOT_READY', message: 'The staged update is ready.' };
  }
}
export const playbackStateZod = z
  .object({
    schemaVersion: z.literal(2),
    eventKey: graphicIdentifierZod,
    revision: graphicRevisionZod,
    loaded: loadedGraphicsSnapshotZod.nullable(),
    cue: graphicsCueZod,
    program: graphicsProgramZod.nullable(),
    stagedUpdate: graphicsStagedUpdateZod,
    transition: graphicsTransitionZod.nullable(),
    lastCommandId: graphicIdentifierZod.nullable(),
    updatedAtUtc: utcTimestampZod
  })
  .strict()
  .refine(
    (state) =>
      !state.loaded ||
      state.loaded.timelines.every((t) => t.eventKey === state.eventKey),
    'Loaded timelines must belong to the playback event'
  );
export type PlaybackState = z.infer<typeof playbackStateZod>;

/**
 * Complete state sent from the durable API authority to the stateless realtime
 * fan-out service. `authorityEpoch` identifies one API process lifetime so a
 * realtime process can retire a previous writer without confusing a restarted
 * authority's revision stream with an in-flight delivery from the old writer.
 */
export const PLAYBACK_STATE_ENVELOPE_SCHEMA_VERSION = 1 as const;

export const playbackStateEnvelopeZod = z
  .object({
    schemaVersion: z.literal(PLAYBACK_STATE_ENVELOPE_SCHEMA_VERSION),
    authorityEpoch: graphicIdentifierZod,
    eventKey: graphicIdentifierZod,
    state: playbackStateZod
  })
  .strict()
  .refine(
    (publication) => publication.eventKey === publication.state.eventKey,
    {
      message: 'Published playback state must match the envelope event',
      path: ['state', 'eventKey']
    }
  );
export type PlaybackStateEnvelope = z.infer<typeof playbackStateEnvelopeZod>;

/** API-to-realtime publication and browser delivery intentionally share one wire contract. */
export const playbackPublicationZod = playbackStateEnvelopeZod;
export type PlaybackPublication = PlaybackStateEnvelope;

export function createPlaybackStateEnvelope(
  authorityEpoch: string,
  state: PlaybackState
): PlaybackStateEnvelope {
  return playbackStateEnvelopeZod.parse({
    schemaVersion: PLAYBACK_STATE_ENVELOPE_SCHEMA_VERSION,
    authorityEpoch,
    eventKey: state.eventKey,
    state
  });
}

export function createEmptyPlaybackState(
  eventKey: string,
  atUtc = new Date().toISOString()
): PlaybackState {
  return playbackStateZod.parse({
    schemaVersion: 2,
    eventKey,
    revision: 0,
    loaded: null,
    cue: { status: 'empty' },
    program: null,
    stagedUpdate: { status: 'empty' },
    transition: null,
    lastCommandId: null,
    updatedAtUtc: atUtc
  });
}

const commandFields = {
  requestId: graphicIdentifierZod,
  expectedRevision: graphicRevisionZod.optional()
};

/**
 * Names the ordered-show entry a `load` CONSUMES as part of the same durable
 * write that puts it on the transport.
 *
 * Loading the on-deck entry and removing it from the rundown used to be two
 * browser requests (`live.load` then a rundown PATCH). A failure between them
 * left the entry both loaded and still queued - so the producer could run it
 * twice - and a retry or a StrictMode effect replay could consume two entries
 * for one operator action. With this field the removal happens inside the SAME
 * SQLite transaction as the playback commit that sets `state.loaded`: either
 * the entry is gone AND the show is on the transport, or neither happened.
 *
 * `expectedRundownRevision` is the show revision the caller chose this entry
 * from. A mismatch (someone reordered or removed in between) rolls the whole
 * command back with CONFLICT rather than consuming an entry the operator never
 * saw in that position. Omit it only for a caller that genuinely wants
 * "whatever that entry id is now", not "the entry I was looking at".
 */
export const rundownEntryRefZod = z
  .object({
    rundownId: graphicIdentifierZod,
    entryId: graphicIdentifierZod,
    expectedRundownRevision: graphicRevisionZod.optional()
  })
  .strict();
export type RundownEntryRef = z.infer<typeof rundownEntryRefZod>;
export const playbackCommandZod = z.discriminatedUnion('type', [
  // `values` resolves any of the timeline's items' template bindings at load
  // time (the same variable-name -> positive-integer map `load-rundown`
  // entries carry - inlined here rather than importing `variableValuesZod`
  // from `GraphicsTemplates.ts`, which imports FROM this file). Omitted or
  // empty is exactly today's behavior: any bound item's cue comes back
  // `failed` ("Fill in: <name>") until navigated to with values supplied.
  z
    .object({
      ...commandFields,
      type: z.literal('load'),
      timelineId: graphicIdentifierZod,
      values: z
        .record(z.string().min(1), z.number().int().positive())
        .optional(),
      // Atomic consume-and-load: see `rundownEntryRefZod`. Part of the
      // command's own fingerprint, so replaying this request id returns the
      // original acknowledgment and never removes a second entry.
      consume: rundownEntryRefZod.optional()
    })
    .strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('load-rundown'),
      rundownId: graphicIdentifierZod
    })
    .strict(),
  // Mirrors `clear` (which nulls `program`) but for `loaded`: durably empties
  // the transport back to nothing-loaded. Idempotent - unloading an already-
  // unloaded transport is still a success, same philosophy as `clear`.
  z.object({ ...commandFields, type: z.literal('unload') }).strict(),
  z.object({ ...commandFields, type: z.literal('advance') }).strict(),
  z.object({ ...commandFields, type: z.literal('previous') }).strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('go'),
      index: z.number().int().nonnegative()
    })
    .strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('cue'),
      spec: preparedGraphicSpecZod
    })
    .strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('take'),
      target: graphicsTargetZod
    })
    .strict(),
  z.object({ ...commandFields, type: z.literal('clear') }).strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('quick-take'),
      spec: preparedGraphicSpecZod
    })
    .strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('refresh'),
      destination: z.enum(['cue', 'program']),
      target: graphicsTargetZod,
      /**
       * Promotes THIS refresh's own result in the same durable commit that
       * marks it ready, instead of leaving it staged for a later
       * `push-update`.
       *
       * This exists so a caller that already knows it wants the result on the
       * destination it just recalculated - an automation, a Companion button,
       * any headless caller - has no window between staging and promoting in
       * which a DIFFERENT staged update could take the promotion. The
       * coordinator's own `ticketCurrent` check still gates it: if anything
       * superseded this refresh (another refresh, a take, a clear), the
       * promotion never happens and the whole command is rejected
       * `SUPERSEDED`. It can therefore only ever promote the exact
       * recalculation this command produced.
       *
       * It is NOT a way to skip producer intent: the producer (or the
       * automation acting for one) commanded this exact destination in this
       * exact request.
       */
      push: z.boolean().optional()
    })
    .strict(),
  z
    .object({
      ...commandFields,
      type: z.literal('push-update'),
      target: graphicsTargetZod,
      /**
       * The destination the caller formed its intent against - `'cue'` or
       * `'program'`.
       *
       * `target` alone does NOT identify a staged update: `take` preserves
       * the cue (see `PlaybackProgram.take`), so after a take the cue and the
       * program share one target and a cue refresh and a program refresh
       * staged against them are indistinguishable by target. Naming the
       * destination here binds the push to the staged update the caller
       * actually meant; a mismatch is rejected rather than promoting the
       * other one.
       *
       * Optional only so a producer pressing a bare "Push" button (the
       * Companion path) can still mean "push whatever is staged right now",
       * which is a real, explicit, human action. EVERY caller that formed its
       * intent against a specific refresh must send this, and should send
       * `expectedRevision` with it.
       */
      destination: z.enum(['cue', 'program']).optional()
    })
    .strict()
]);
export type PlaybackCommand = z.infer<typeof playbackCommandZod>;

/**
 * Why a playback publication did not reach realtime.
 *
 * - `too-large`: the envelope exceeds the ingress limit. Fails identically forever.
 * - `realtime-unreachable`: the API could not connect to realtime, or timed out.
 * - `realtime-rejected`: realtime answered with an error status.
 * - `retired-epoch`: realtime has adopted another API process as the writer
 *   for this event and ignores this one. Retrying here cannot help.
 * - `publish-failed`: anything else; the message carries the detail.
 */
export const playbackDeliveryFailureReasonZod = z.enum([
  'too-large',
  'realtime-unreachable',
  'realtime-rejected',
  'retired-epoch',
  'publish-failed'
]);
export type PlaybackDeliveryFailureReason = z.infer<
  typeof playbackDeliveryFailureReasonZod
>;

/**
 * Whether committed playback state reached realtime (and so the displays).
 *
 * Returned by `GET /graphics/:eventKey/live/publication-health`,
 * `POST|GET /graphics/:eventKey/live/publication-retry`, and attached as
 * `delivery` to every playback command acknowledgment.
 *
 * Publication runs AFTER the durable commit and is not awaited, so the
 * acknowledgment for revision N reports delivery as of that instant:
 * - `in-flight`: `pendingRevision` is being sent and nothing has failed yet.
 *   Resolved by the next command's acknowledgment or an explicit health read.
 * - `failing`: the last attempt failed; an automatic retry is scheduled or a
 *   newer revision is being attempted. `failure` says why.
 * - `parked`: delivery stopped and will not resume without an explicit
 *   publication retry (or a new command). `failure` says why.
 * - `delivered`: nothing is pending; `lastDeliveredRevision` reached realtime.
 * - `idle`: nothing has been published by this API process yet.
 * - `unconfigured`: this API has no realtime publisher; no display is updated.
 */
export const playbackDeliveryStatusZod = z.enum([
  'unconfigured',
  'idle',
  'in-flight',
  'failing',
  'parked',
  'delivered'
]);
export type PlaybackDeliveryStatus = z.infer<typeof playbackDeliveryStatusZod>;

export const playbackDeliveryHealthZod = z
  .object({
    eventKey: graphicIdentifierZod,
    status: playbackDeliveryStatusZod,
    configured: z.boolean(),
    pendingRevision: graphicRevisionZod.nullable(),
    attempts: z.number().int().nonnegative(),
    nextRetryAtUtc: z.string().nullable(),
    lastDeliveredRevision: graphicRevisionZod.nullable(),
    lastDeliveredAtUtc: z.string().nullable(),
    /** One-line summary of `failure`, or null. */
    error: z.string().nullable(),
    failure: z
      .object({
        reason: playbackDeliveryFailureReasonZod,
        /** The revision whose delivery failed. */
        revision: graphicRevisionZod,
        attempts: z.number().int().nonnegative(),
        /** False when retrying the same envelope will fail the same way. */
        retryable: z.boolean(),
        parkedAtUtc: z.string().nullable(),
        /** The underlying error, naming event, revision and cause. */
        message: z.string(),
        /** What the operator should do about it. */
        action: z.string()
      })
      .strict()
      .nullable()
  })
  .strict();
export type PlaybackDeliveryHealth = z.infer<typeof playbackDeliveryHealthZod>;

export const playbackAcknowledgmentZod = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      requestId: graphicIdentifierZod,
      state: playbackStateZod,
      replayed: z.boolean(),
      /**
       * Delivery health at the instant this answer was sent - see
       * `playbackDeliveryHealthZod`. Attached by the HTTP surface, never
       * persisted: a replayed acknowledgment reports delivery as it is now.
       */
      delivery: playbackDeliveryHealthZod.optional()
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      requestId: graphicIdentifierZod,
      error: graphicsErrorZod,
      state: playbackStateZod.optional(),
      delivery: playbackDeliveryHealthZod.optional()
    })
    .strict()
]);
export type PlaybackAcknowledgment = z.infer<typeof playbackAcknowledgmentZod>;

/**
 * What one operator "advance the show" action did.
 *
 * `POST /graphics/:eventKey/live/show/advance` replaces the browser sequences
 * that used to spell this out as three or four separate requests (clear ->
 * load -> take -> rundown PATCH). One request, one request id, one answer -
 * carrying BOTH authoritative documents the producer app renders from, so the
 * caller applies them to its caches once instead of revalidating twice and
 * racing itself.
 *
 * `outcome` distinguishes the cases the old code could not report at all:
 *  - `loaded` / `loaded-and-taken`: the entry was consumed and is on the
 *    transport (and, for the latter, on air).
 *  - `empty`: there was nothing to advance to. With `clearFirst`, the
 *    transport was unloaded; this is a normal outcome, never an error.
 *  - `rejected`: nothing was consumed. `acknowledgment.ok` is false and names
 *    the reason; `show` is still the server's current document.
 */
export const showAdvanceOutcomeZod = z.enum([
  'loaded',
  'loaded-and-taken',
  'empty',
  'rejected'
]);
export type ShowAdvanceOutcome = z.infer<typeof showAdvanceOutcomeZod>;
export const showAdvanceResultZod = z
  .object({
    outcome: showAdvanceOutcomeZod,
    /** The entry this action consumed, or `null` when it consumed nothing. */
    consumedEntryId: graphicIdentifierZod.nullable(),
    /** The acknowledgment of the command that determined `outcome` (the load, the take, or the rejection). */
    acknowledgment: playbackAcknowledgmentZod,
    /** The show as it stands AFTER this action - apply it to the client cache verbatim. */
    show: rundownZod
  })
  .strict();
export type ShowAdvanceResult = z.infer<typeof showAdvanceResultZod>;

/** Semantics shared by API, Companion relay, and browser clients. */
export const GRAPHICS_PLAYBACK_POLICY = {
  navigation: 'prepare-cue-only',
  indexing: 'zero-based',
  boundary: 'auto-roll-cue-only',
  take: 'ready-target-only',
  clear: 'preserve-cue',
  refresh: 'stage-completed-calculation',
  restore: 'exact-persisted-program',
  autoplay: 'cue-only-never-program',
  /** Persist acknowledgements keyed by event + requestId; reuse with different payload is CONFLICT. */
  requestReplay: 'return-original-acknowledgment',
  concurrency: 'expected-revision-or-target-token',
  timestampCoordinates: 'epoch-milliseconds'
} as const;

/** Next loaded item after program; falls back to the cursor for a different snapshot or black. */
export function nextPlaybackPreviewSpec(state: PlaybackState | null): GraphicSpec | null {
  const loaded = state?.loaded;
  if (!loaded) return null;
  const target = state?.program?.graphic.target;
  const index = target?.snapshotId === loaded.snapshotId && target.index !== null
    ? target.index + 1
    : loaded.index;
  return loaded.items[index]?.spec ?? null;
}
