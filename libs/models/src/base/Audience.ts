export enum Displays {
  SPONSOR = 0,
  MATCH_PREVIEW = 1,
  MATCH_START = 2,
  MATCH_RESULTS = 3,
  RANKINGS = 4,
  BLANK = 5
}

export enum DisplayModes {
  DEFAULT = 'default',
  TIMER_ONLY = 'timer-only',
  STREAM = 'stream'
}

export enum AudienceScreens {
  PREVIEW = 'preview-full',
  PREVIEW_STREAM = 'preview-stream',
  MATCH = 'match-full',
  MATCH_STREAM = 'match-stream',
  MATCH_MIN = 'match-min',
  MATCH_PRODUCTION = 'match-production',
  RESULTS = 'results-full',
  RESULTS_STREAM = 'results-stream',
  RANKINGS = 'rankings',
  STATS = 'stats-graphics',
  /** Always shows the next cued item (`state.cue`), never what's on air - the "PVW bus" to `STATS`'s "PGM bus". */
  STATS_PREVIEW = 'stats-graphics-preview'
}

export enum LayoutMode {
  OFF = 'o',
  STREAM = 's',
  FULL = 'f',
  RESULTS = 'r',
  MIN = 'm'
}
