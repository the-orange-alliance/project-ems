import type {
  GraphicKind,
  GraphicSpec,
  PresentationMode
} from '@toa-lib/models';
import type { StatCatalogueEntry } from '../../api/use-stats-data.js';

/**
 * The subset of `presentationFor(catalogueId)`'s return (see
 * `libs/models/src/seasons/stats/presentation/presentation.ts`) that
 * `buildDefaultSpec` needs. Kept as a local structural type rather than an
 * import so this file doesn't take on a hard dependency on the presentation
 * module's exact export path - any object shaped like this (in particular,
 * the real `StatPresentation` returned by `presentationFor`) satisfies it.
 *
 * NOTE: `family` here is the *visualization* family (how the stat's shape
 * wants to be drawn - scalar/teamRows/ranking/etc.) - it is UNRELATED to
 * `StatCatalogueEntry['family']` ('EMS'/'DER'/'REF'), which is data
 * provenance. Never conflate the two.
 */
export interface QuickStatPresentation {
  family: string;
  defaultKind: GraphicKind;
  allowedKinds: GraphicKind[];
  valuePaths: string[];
  valueLabel: string;
  unitLabel: string;
  precision: number;
  higherIsBetter: boolean;
}

/**
 * Sensible default `PresentationMode` for a given `GraphicKind`, so a
 * producer never has to choose one themselves for the one-click path:
 *  - a single big number reads best as a `lower-third` (doesn't block the
 *    live shot).
 *  - a table/ranking needs the room a `fullscreen` graphic gives it.
 *  - every chart kind defaults to `drawer-right` - big enough to read, small
 *    enough to keep the live shot on screen alongside it.
 */
const modeForKind = (kind: GraphicKind): PresentationMode => {
  switch (kind) {
    case 'stat-tile':
      return 'lower-third';
    case 'table':
    case 'ranking-table':
      return 'fullscreen';
    default:
      return 'drawer-right';
  }
};

/**
 * Builds a complete, immediately-usable `GraphicSpec` draft for one
 * catalogue entry - no user input required. This is the entire "one click"
 * contract for the Quick Stat drawer: every required `GraphicSpec` field is
 * populated here from data already in hand (the catalogue entry + its
 * presentation metadata).
 *
 * `filters.tournamentTypes` is seeded from `catalogueEntry.defaultTournamentTypes`
 * when present - the stats API rejects (HTTP 400) any query whose
 * `filters.tournamentTypes` falls outside the stat's `allowedTournamentTypes`,
 * so this is what keeps a one-click draft from being an invalid query.
 */
export function buildDefaultSpec(
  catalogueEntry: StatCatalogueEntry,
  presentation: QuickStatPresentation
): GraphicSpec {
  return {
    id: crypto.randomUUID(),
    title: catalogueEntry.name,
    stat: catalogueEntry.slug,
    kind: presentation.defaultKind,
    mode: modeForKind(presentation.defaultKind),
    selectors: {},
    filters: catalogueEntry.defaultTournamentTypes?.length
      ? { tournamentTypes: catalogueEntry.defaultTournamentTypes }
      : {},
    params: {},
    options: {
      limit: 8,
      sortDir: 'desc',
      precision: presentation.precision,
      showTeamNames: true
    }
  };
}
