/** Entity labels and source time supplied to semantic frame preparation. */
export interface AdaptContext {
  catalogueId: string;
  teams?: { teamKey: number; teamNumber?: string; teamNameShort?: string }[];
  /**
   * `participants` is optional and only ever read by `applyAllianceGroups`
   * (see `semantic-helpers.ts`) to color/group a `teamsInMatchId` graphic by
   * alliance - every other consumer of `matches` (labels, etc.) ignores it.
   * A caller that never populates it just means that graphic never gets
   * alliance grouping, never a crash - see each `LoadEntities`/data-source
   * implementation for whether it's populated.
   */
  matches?: {
    tournamentKey: string;
    id: number;
    name?: string;
    participants?: { teamKey: number; station: number }[];
  }[];
  asOfUtc: string;
}

