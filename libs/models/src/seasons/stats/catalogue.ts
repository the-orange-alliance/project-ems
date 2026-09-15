// One public registration per authoritative catalogue row.
export const catalogue = [
  {
    catalogueId: 'A1',
    name: 'OPR',
    slug: 'generic.opr',
    description:
      'Least-squares solve `Ax = b`; A = match×team participation matrix, b = alliance scores. `x` = per-team contribution',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A2',
    name: 'Suppression OPR',
    slug: 'fgc2026.suppression-opr',
    description:
      'Same solve, b = `wildfireIn{Red,Blue}SuppressionUnit`. Cleanest signal — excludes shared terms',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A3',
    name: 'Pre-multiplier OPR',
    slug: 'fgc2026.pre-multiplier-opr',
    description:
      'b = `supp × mult` (the multiplied term only). Separates "who fills the unit" from "who is in a good alliance"',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A4',
    name: 'Climb OPR',
    slug: 'fgc2026.climb-opr',
    description: 'b = alliance `climbMultiplier − 1`. Deconvolves climb credit',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A5',
    name: 'Extinguisher OPR',
    slug: 'fgc2026.extinguisher-opr',
    description:
      'b = `wildfireInExtinguisher`, A = all 6 teams in match (single alliance of six)',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A6',
    name: 'DPR',
    slug: 'generic.dpr',
    description: '`DPR = OPR − CCWM`; or solve with b = opponent score',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A7',
    name: 'CCWM',
    slug: 'generic.ccwm',
    description: 'Solve with b = `ownScore − oppScore`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A8',
    name: 'Adjusted / ridge OPR',
    slug: 'generic.adjusted-ridge-opr',
    description:
      '`x = (AᵀA + λI)⁻¹Aᵀb`; λ shrinks low-match-count teams toward field mean',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A9',
    name: 'iOPR',
    slug: 'generic.iopr',
    description:
      'Iterate OPR, re-seeding b with previous-round residuals until convergence',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A10',
    name: 'EPA',
    slug: 'generic.epa',
    description:
      'Elo-style: `EPA_new = EPA_old + K × (actualScore − predictedAllianceScore)/3`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A11',
    name: 'Component EPA',
    slug: 'fgc2026.component-epa',
    description:
      'Run A10 separately on suppression, climb-mult, partner-climb subscores',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A12',
    name: 'Normalized / unitless EPA',
    slug: 'generic.normalized-unitless-epa',
    description: '`(EPA − fieldMean) / fieldStdDev`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A13',
    name: 'Elo',
    slug: 'generic.elo',
    description:
      "`R' = R + K(S − E)`, `E = 1/(1+10^((Ropp−R)/400))`, S = win/tie/loss",
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A14',
    name: 'Elo peak / Elo delta',
    slug: 'generic.elo-peak-elo-delta',
    description: '`max(R_t)` over event; `R_final − R_initial`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A15',
    name: 'TrueSkill / Bradley-Terry',
    slug: 'generic.trueskill-bradley-terry',
    description: 'Bayesian skill+uncertainty update per match, team-level',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A16',
    name: 'Win probability (pre-match)',
    slug: 'generic.win-probability-pre-match',
    description: 'Logistic on `Σ EPA_red − Σ EPA_blue`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A17',
    name: 'Predicted score',
    slug: 'fgc2026.predicted-score',
    description: '`Σ(component EPAs of the 3 teams) + shared-term expectation`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A18',
    name: 'Predicted margin',
    slug: 'generic.predicted-margin',
    description: '`predRed − predBlue` (shared terms cancel — see L2)',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A19',
    name: 'Predicted score distribution',
    slug: 'generic.predicted-score-distribution',
    description:
      'Monte-Carlo resample team component distributions → p10/p50/p90',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A20',
    name: 'Model Brier score',
    slug: 'generic.model-brier-score',
    description: '`mean((predictedWinProb − actualOutcome)²)` across event',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A21',
    name: 'Upset index',
    slug: 'generic.upset-index',
    description: '`1 − predictedWinProb` of the alliance that actually won',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A22',
    name: 'Consistency',
    slug: 'generic.consistency',
    description: "`stdev(team's per-match contribution)`",
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A23',
    name: 'Ceiling / floor',
    slug: 'generic.ceiling-floor',
    description: '`max` / `min` of per-match contribution',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A24',
    name: 'Strength of schedule (partners)',
    slug: 'generic.strength-of-schedule-partners',
    description: '`mean(OPR of all partners across scheduled matches)`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A25',
    name: 'Strength of schedule (opponents)',
    slug: 'generic.strength-of-schedule-opponents',
    description: '`mean(OPR of all opponents)`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A26',
    name: 'Luck rating',
    slug: 'fgc2026.luck-rating',
    description: '`actual rankingScore − expected rankingScore given schedule`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A27',
    name: 'W-L-T',
    slug: 'generic.w-l-t',
    description:
      'Count `redScore > blueScore` etc. per participant station (<20 red, ≥20 blue)',
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A28',
    name: 'Win %',
    slug: 'generic.win',
    description: '`wins / played`',
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A29',
    name: 'Ranking Score (official)',
    slug: 'fgc2026.ranking-score-official',
    description:
      '`mean(match scores)` with single lowest dropped; red card → excluded, white card → 0',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A30',
    name: 'Rank / rank change',
    slug: 'fgc2026.rank-rank-change',
    description:
      'Sort by RS, then `highestScore`, then `climbPoints`; `rankChange = prevRank − rank`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A31',
    name: 'Rank volatility',
    slug: 'fgc2026.rank-volatility',
    description: "`stdev(rank_t)` across the event's ranking recalcs",
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A32',
    name: 'Highest single match score (TB1)',
    slug: 'fgc2026.highest-single-match-score-tb1',
    description:
      '`max(allianceScore)` over matches where `cardStatus ≤ YELLOW`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A33',
    name: 'Cumulative climb points (TB2)',
    slug: 'fgc2026.cumulative-climb-points-tb2',
    description:
      '`Σ own BraceState value` across matches (0/.05/.10/.20/.30 summed)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'A34',
    name: 'Average / median score',
    slug: 'generic.average-median-score',
    description: "`mean` / `median` of the team's alliance scores",
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A35',
    name: 'Score vs field average',
    slug: 'generic.score-vs-field-average',
    description: '`teamAvgScore − eventAvgScore`',
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A36',
    name: 'Matches played / surrogate count',
    slug: 'generic.matches-played-surrogate-count',
    description: '`count(participants)`, `count(surrogate > 0)`',
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A37',
    name: 'Unique partners count',
    slug: 'generic.unique-partners-count',
    description:
      '`distinct(teamKeys sharing an alliance)` — high by design, alliances randomized each ranking match',
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A38',
    name: 'Head-to-head record',
    slug: 'generic.head-to-head-record',
    description: 'W-L vs a given opponent team across shared matches',
    family: 'EMS',
    seasonKey: null
  },
  {
    catalogueId: 'A39',
    name: 'Percentile rank',
    slug: 'generic.percentile-rank',
    description: '`1 − (rank / teamCount)` on any metric',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A40',
    name: 'Form / momentum',
    slug: 'generic.form-momentum',
    description: '`mean(last 3 scores) − mean(first 3 scores)`',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A41',
    name: 'Trend slope',
    slug: 'generic.trend-slope',
    description: 'Linear regression of team score vs match index',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'A42',
    name: 'Counterfactual pairing',
    slug: 'generic.counterfactual-pairing',
    description: 'Re-run score model swapping one partner; report Δ',
    family: 'DER',
    seasonKey: null
  },
  {
    catalogueId: 'B1',
    name: 'Suppression balls',
    slug: 'fgc2026.suppression-balls',
    description:
      '`wildfireInRedSuppressionUnit` / `wildfireInBlueSuppressionUnit`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B2',
    name: 'Extinguisher balls',
    slug: 'fgc2026.extinguisher-balls',
    description:
      '`wildfireInExtinguisher` (one value, credited to both alliances)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B3',
    name: 'Total contained',
    slug: 'fgc2026.total-contained',
    description: '`redSupp + blueSupp + exting`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B4',
    name: 'Containment rate / field clear %',
    slug: 'fgc2026.containment-rate-field-clear',
    description: '`totalContained / 500`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B5',
    name: 'Unscored WILDFIRE',
    slug: 'fgc2026.unscored-wildfire',
    description:
      '`500 − totalContained`. Everything still on the field, in a robot, or in a chute at 0:00 — all worth zero, so the residual is exact without observing any of it',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B6',
    name: 'Suppression share',
    slug: 'fgc2026.suppression-share',
    description: '`(redSupp + blueSupp) / totalContained`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B7',
    name: 'Extinguisher share',
    slug: 'fgc2026.extinguisher-share',
    description: '`exting / totalContained`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B8',
    name: 'Suppression differential',
    slug: 'fgc2026.suppression-differential',
    description: '`redSupp − blueSupp`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B9',
    name: 'Balls per second (match)',
    slug: 'fgc2026.balls-per-second-match',
    description: '`totalContained / 150`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B10',
    name: 'Balls per second (alliance)',
    slug: 'fgc2026.balls-per-second-alliance',
    description: '`supp / 150`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B11',
    name: 'Peak scoring window',
    slug: 'fgc2026.peak-scoring-window',
    description:
      "`max Σ(newValue − oldValue)` over any rolling 10 s of `match_action_event` where `fieldPath LIKE 'details.wildfireIn%'`, after dropping typed intermediates",
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B12',
    name: 'Time to first ball',
    slug: 'fgc2026.time-to-first-ball',
    description: '`min(occurredAtUtc)` on that `fieldPath` − `actualStartTime`',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B13',
    name: 'Milestone splits',
    slug: 'fgc2026.milestone-splits',
    description:
      '`occurredAtUtc` of the event whose `newValue` first crosses 50 / 100 / 200 / 300',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B14',
    name: 'Scoring curve shape',
    slug: 'fgc2026.scoring-curve-shape',
    description:
      'Plot `newValue` vs `(occurredAtUtc − actualStartTime)`; report front- or back-loaded skew',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B15',
    name: 'Longest drought',
    slug: 'fgc2026.longest-drought',
    description:
      "`max` gap between consecutive events on that alliance's suppression `fieldPath`",
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B16',
    name: 'Extinguisher entry attribution',
    slug: 'fgc2026.extinguisher-entry-attribution',
    description:
      'Group `details.wildfireInExtinguisher` events by `actorId` / `clientId`. Identifies the *tablet*, not the scorer, and up to three tablets race on this one counter',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B17',
    name: 'LED↔ball divergence',
    slug: 'fgc2026.led-ball-divergence',
    description:
      '`approximateWildfire* × wildfireBallsPerLed` vs `wildfireIn*` — non-zero means a ref typed the ball side directly instead of reading LEDs',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B18',
    name: 'Score granularity',
    slug: 'fgc2026.score-granularity',
    description:
      '`wildfireBallsPerLed × climbMultiplier` — the smallest score step the ref can actually enter',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B19',
    name: 'Stepped vs typed entry',
    slug: 'fgc2026.stepped-vs-typed-entry',
    description:
      'Share of suppression events with `|new − old| == 1` (a +/− tap) vs `> 1` (a typed total). Tells you how literal the velocity curve is',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B20',
    name: 'Provisional vs final delta',
    slug: 'fgc2026.provisional-vs-final-delta',
    description:
      '`redScore` at `max(revision)` − `redScore` at the first revision after `actualStartTime + 150 s`, from `match_history_base`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B21',
    name: 'Event balls contained',
    slug: 'fgc2026.event-balls-contained',
    description: '`Σ totalContained` over all matches',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'B22',
    name: 'Event containment rate',
    slug: 'fgc2026.event-containment-rate',
    description: '`Σ totalContained / (500 × matchCount)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C1',
    name: 'Brace state per robot',
    slug: 'fgc2026.brace-state-per-robot',
    description:
      '`{red,blue}Robot{One,Two,Three}BraceState` → None / Contact / Z1 / Z2 / Z3',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C2',
    name: 'Climb multiplier',
    slug: 'fgc2026.climb-multiplier',
    description:
      '`1 + Σ(3 BraceStates)`; also stored as `red/blueClimbMultiplier`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C3',
    name: 'Multiplier efficiency',
    slug: 'fgc2026.multiplier-efficiency',
    description: '`(mult − 1) / 0.90` — fraction of theoretical max climb',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C4',
    name: 'Zone 3 rate (team)',
    slug: 'fgc2026.zone-3-rate-team',
    description: '`count(BraceState == .30) / played`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C5',
    name: 'Zone distribution (team)',
    slug: 'fgc2026.zone-distribution-team',
    description: "Histogram of that team's BraceState across matches",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C6',
    name: 'Any-climb rate',
    slug: 'fgc2026.any-climb-rate',
    description: '`count(BraceState > 0) / played`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C7',
    name: 'Off-ground rate',
    slug: 'fgc2026.off-ground-rate',
    description: '`count(BraceState ≥ .10) / played` (excludes CONTACT)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C8',
    name: 'Best zone ever',
    slug: 'fgc2026.best-zone-ever',
    description: '`max(BraceState)` for the team across the event',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C9',
    name: 'Perfect alliance climb',
    slug: 'fgc2026.perfect-alliance-climb',
    description: 'All 3 own robots at `.30` → mult = 1.90',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C10',
    name: 'Best multiplier of event',
    slug: 'fgc2026.best-multiplier-of-event',
    description: '`max(climbMultiplier)` across all matches / alliances',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C11',
    name: 'Marginal climb value',
    slug: 'fgc2026.marginal-climb-value',
    description:
      '`supp × ownBraceState` — points *this specific climb* added in *this* match',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C12',
    name: 'Most valuable single climb',
    slug: 'fgc2026.most-valuable-single-climb',
    description: "`max(C11)` across event. Scales with partners' ball count",
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C13',
    name: 'Points forgone by not climbing',
    slug: 'fgc2026.points-forgone-by-not-climbing',
    description: '`supp × (0.30 − actualBraceState)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C14',
    name: 'Endgame swing',
    slug: 'fgc2026.endgame-swing',
    description:
      '`score − (supp + partnerPts + exting + coop)` = `supp × (mult − 1)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C15',
    name: 'Alliance climb points added',
    slug: 'fgc2026.alliance-climb-points-added',
    description: '`supp × (mult − 1)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C16',
    name: 'Brace log time',
    slug: 'fgc2026.brace-log-time',
    description:
      '`occurredAtUtc` of the first non-`None` `*BraceState` for that station − `actualStartTime`. When the *ref logged* the climb',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C17',
    name: 'Last brace entry vs buzzer',
    slug: 'fgc2026.last-brace-entry-vs-buzzer',
    description:
      '`(actualStartTime + 150 s) − occurredAtUtc`(last `*BraceState` event in the match)',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C18',
    name: 'First brace logged in match',
    slug: 'fgc2026.first-brace-logged-in-match',
    description: '`min(occurredAtUtc)` across all six `*BraceState` fieldPaths',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C19',
    name: 'Zone upgrade path',
    slug: 'fgc2026.zone-upgrade-path',
    description:
      "Ordered `oldValue → newValue` sequence on one station's toggle — e.g. `0 → 0.1 → 0.3`",
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C20',
    name: 'Brace call revisions',
    slug: 'fgc2026.brace-call-revisions',
    description:
      'Count of `*BraceState` events for a station beyond the first. A downward revision is the ref correcting the call; it does **not** distinguish a robot that fell',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C21',
    name: 'Event Zone-3 count',
    slug: 'fgc2026.event-zone-3-count',
    description: '`Σ` robots at `.30` across all matches',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'C22',
    name: 'Zone-3 rate over time',
    slug: 'fgc2026.zone-3-rate-over-time',
    description: 'Zone-3 count per match, plotted by match number',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D1',
    name: 'Partner climbs in match',
    slug: 'fgc2026.partner-climbs-in-match',
    description: '`count({red,blue}Robot*PartnerClimb == true)` per alliance',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D2',
    name: 'Partner climb points',
    slug: 'fgc2026.partner-climb-points',
    description: '`25 × D1` (0/25/50; schema permits 75)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D3',
    name: 'Carried rate (team)',
    slug: 'fgc2026.carried-rate-team',
    description: '`count(own partnerClimb flag) / played`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D4',
    name: 'Carrier rate (team)',
    slug: 'fgc2026.carrier-rate-team',
    description:
      "Infer via `BraceState > 0` while a partner's flag is set. **Unambiguous only when exactly one robot on the alliance is braced** — with two braced robots the carrier is undetermined",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D5',
    name: 'Double-carry',
    slug: 'fgc2026.double-carry',
    description: 'Alliance with 2 partner-climb flags and 1 robot on the brace',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D6',
    name: 'Carry + Z3 combo',
    slug: 'fgc2026.carry-z3-combo',
    description: 'Carrier at `.30` while carrying ≥1 partner',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D7',
    name: 'Partner climb share of score',
    slug: 'fgc2026.partner-climb-share-of-score',
    description: '`partnerPts / score`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D8',
    name: 'Lift specialist',
    slug: 'fgc2026.lift-specialist',
    description: 'Team with highest D4 across the event',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'D9',
    name: 'Event partner-climb total',
    slug: 'fgc2026.event-partner-climb-total',
    description: '`Σ partnerPts` over all matches',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E1',
    name: 'Coopertition bonus',
    slug: 'fgc2026.coopertition-bonus',
    description: '`coopertition` field; from Zone-3 count across all 6 robots',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E2',
    name: 'Global Zone-3 count',
    slug: 'fgc2026.global-zone-3-count',
    description: '`Σ(all 6 BraceStates == .30)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E3',
    name: 'Coopertition rate',
    slug: 'fgc2026.coopertition-rate',
    description: '`count(coop > 0) / matchCount`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E4',
    name: 'Perfect coopertition rate',
    slug: 'fgc2026.perfect-coopertition-rate',
    description: '`count(coop == 40) / matchCount` (all six robots at Z3)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E5',
    name: 'Near-miss rate',
    slug: 'fgc2026.near-miss-rate',
    description:
      '`count(globalZone3Count == 3) / matchCount` — one robot short of 10 pts',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E6',
    name: 'Shared points',
    slug: 'fgc2026.shared-points',
    description: '`exting + coop` — identical for both alliances',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E7',
    name: 'Shared points share',
    slug: 'fgc2026.shared-points-share',
    description:
      '`(exting + coop) / score` — "how much of your score you didn\'t earn alone"',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E8',
    name: 'Independent score',
    slug: 'fgc2026.independent-score',
    description: '`score − exting − coop` = `supp × mult + partnerPts + fouls`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E9',
    name: 'Team cooperative index',
    slug: 'fgc2026.team-cooperative-index',
    description: "`mean(exting + coop)` across the team's matches",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E10',
    name: 'Coopertition contributed',
    slug: 'fgc2026.coopertition-contributed',
    description:
      "Did this team's Z3 push the count over a 4/5/6 threshold? Binary per match",
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E11',
    name: 'Coopertition denied',
    slug: 'fgc2026.coopertition-denied',
    description:
      'Match where global Z3 count == 3 and this team was at `< .30`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E12',
    name: 'Cross-alliance assist',
    slug: 'fgc2026.cross-alliance-assist',
    description:
      'Cases where the 4th Z3 robot came from the *opposing* alliance',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'E13',
    name: 'Event global-alliance total',
    slug: 'fgc2026.event-global-alliance-total',
    description: '`Σ(exting + coop)` across event',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F1',
    name: 'Full breakdown',
    slug: 'fgc2026.full-breakdown',
    description:
      '`supp×mult` / `partnerPts` / `exting` / `coop` / `oppFouls` as 5 slices',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F2',
    name: '% from each source',
    slug: 'fgc2026.from-each-source',
    description: 'Each slice / `score`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F3',
    name: 'Pre-multiplier score',
    slug: 'fgc2026.pre-multiplier-score',
    description: '`supp + partnerPts + exting + coop`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F4',
    name: 'Multiplier-added points',
    slug: 'fgc2026.multiplier-added-points',
    description: '`supp × (mult − 1)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F5',
    name: 'Counterfactual: no climb',
    slug: 'fgc2026.counterfactual-no-climb',
    description: '`supp + partnerPts + exting + coop` — would result flip?',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F6',
    name: 'Counterfactual: no coop',
    slug: 'fgc2026.counterfactual-no-coop',
    description: '`score − coop` — result never flips (shared)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F7',
    name: 'Highest / lowest score',
    slug: 'fgc2026.highest-lowest-score',
    description: '`max` / `min(allianceScore)` over event',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F8',
    name: 'Score distribution',
    slug: 'fgc2026.score-distribution',
    description: 'Histogram of all alliance scores',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F9',
    name: 'Margin distribution',
    slug: 'fgc2026.margin-distribution',
    description: 'Histogram of `|redScore − blueScore|`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F10',
    name: 'Tie count',
    slug: 'fgc2026.tie-count',
    description: '`count(result == RESULT_TIE)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F11',
    name: 'Closest / widest match',
    slug: 'fgc2026.closest-widest-match',
    description: '`min` / `max` margin',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F12',
    name: 'Score inflation',
    slug: 'fgc2026.score-inflation',
    description:
      '`mean(score)` bucketed by match number — does the field learn?',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F13',
    name: 'Record progression',
    slug: 'fgc2026.record-progression',
    description: 'Timeline of when `max(score)` was reset',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F14',
    name: 'Theoretical max score',
    slug: 'fgc2026.theoretical-max-score',
    description:
      '500 balls all to one suppression unit × 1.90 + 75 + 0 + 40 = `1065`; realistic split ceiling much lower',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F15',
    name: '% of ceiling achieved',
    slug: 'fgc2026.of-ceiling-achieved',
    description: '`score / theoreticalMax`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F16',
    name: 'Points per ball',
    slug: 'fgc2026.points-per-ball',
    description: '`score / totalContained` — measures multiplier leverage',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'F17',
    name: 'Ceiling rounding gain',
    slug: 'fgc2026.ceiling-rounding-gain',
    description:
      '`ceil(raw) − raw` — the fractional point the multiplier creates',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G1',
    name: 'Minor / major foul counts',
    slug: 'fgc2026.minor-major-foul-counts',
    description: '`red/blueMinPen`, `red/blueMajPen`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G2',
    name: 'Foul points awarded',
    slug: 'fgc2026.foul-points-awarded',
    description: '`(oppMin × .05 + oppMaj × .10) × oppPrePenaltyScore`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G3',
    name: 'Foul points share',
    slug: 'fgc2026.foul-points-share',
    description: '`foulPts / score`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G4',
    name: 'Matches decided by fouls',
    slug: 'fgc2026.matches-decided-by-fouls',
    description: 'Recompute without foul terms; count result flips',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G5',
    name: 'Foul rate (team)',
    slug: 'fgc2026.foul-rate-team',
    description:
      "`Σ fouls in team's matches / played` — alliance-attributed only",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G6',
    name: 'Yellow / red / white card counts',
    slug: 'fgc2026.yellow-red-white-card-counts',
    description: '`MatchParticipant.cardStatus` tallies',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G7',
    name: 'Teams carrying a card',
    slug: 'fgc2026.teams-carrying-a-card',
    description: '`Team.hasCard` / `cardStatus`, scoped by `cardPhase`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G8',
    name: 'Cards by phase',
    slug: 'fgc2026.cards-by-phase',
    description: 'Group G6 by tournament level (quals vs playoffs)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G9',
    name: 'White card rate',
    slug: 'fgc2026.white-card-rate',
    description:
      '`count(WHITE_CARD) / matchCount` — no human player showed (M07)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G10',
    name: 'Red card ranking impact',
    slug: 'fgc2026.red-card-ranking-impact',
    description: 'Score forced to `−1` sentinel, excluded from RS mean',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G11',
    name: 'DQ count',
    slug: 'fgc2026.dq-count',
    description: '`count(disqualified == 1)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G12',
    name: 'No-show count',
    slug: 'fgc2026.no-show-count',
    description: '`count(noShow)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G13',
    name: 'Card issue timing',
    slug: 'fgc2026.card-issue-timing',
    description:
      '`occurredAtUtc` of `match:updateCardStatus` (`participants.<station>.cardStatus`) − `actualStartTime`. Cards *are* entered on the field tablet, so this is live',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'G14',
    name: 'Foul corrections',
    slug: 'fgc2026.foul-corrections',
    description:
      'Count of `red/blueMinPen` / `MajPen` events where `newValue < oldValue`. Fouls are typed on the scorekeeper review screen, so this measures review-desk revisions, not on-field calls',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H1',
    name: 'Live score velocity',
    slug: 'fgc2026.live-score-velocity',
    description:
      '`Δscore / Δt` over the trailing 10 s of `match:updateDetailsItem` events on `details.wildfireIn%`',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H2',
    name: 'Projected final score',
    slug: 'fgc2026.projected-final-score',
    description: '`currentScore + velocity × timeRemaining` + expected endgame',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H3',
    name: 'Live win probability',
    slug: 'fgc2026.live-win-probability',
    description:
      'Logistic on live margin + time remaining + expected climb delta',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H4',
    name: 'Time since last score',
    slug: 'fgc2026.time-since-last-score',
    description:
      "`now − max(occurredAtUtc)` on that alliance's suppression `fieldPath`",
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H5',
    name: 'Scoring run',
    slug: 'fgc2026.scoring-run',
    description:
      'Consecutive events with `newValue > oldValue` for one alliance and none for the other',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H6',
    name: 'Per-30 s segment scoring',
    slug: 'fgc2026.per-30-s-segment-scoring',
    description:
      'Bucket `(newValue − oldValue)` into 5 × 30 s bins on `occurredAtUtc − actualStartTime`',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H7',
    name: 'Additional legal suppression balls needed to lead',
    slug: 'fgc2026.balls-needed-to-take-the-lead',
    description:
      'Minimum N in 0..(500 - totalContained) with officialOwnScore(N) > officialOpponentScore(N); add N only to own suppression, freeze all other inputs, and recalculate both foul awards and ceiling rounding. 0 = already leading; null = impossible or incomplete/invalid data. Cards do not change alliance scores.',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H8',
    name: 'Balls needed for a record',
    slug: 'fgc2026.balls-needed-for-a-record',
    description: '`ceil((eventMaxScore + 1 − ownScore) / mult)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H9',
    name: 'Robots needed for coopertition',
    slug: 'fgc2026.robots-needed-for-coopertition',
    description: '`4 − globalZone3Count` (live, from ref-entered brace states)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H10',
    name: 'Coopertition value at stake',
    slug: 'fgc2026.coopertition-value-at-stake',
    description: 'Points both alliances gain from the next Z3 robot: 10/15/15',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H11',
    name: 'Balls needed to raise ranking score',
    slug: 'fgc2026.balls-needed-to-raise-ranking-score',
    description: '`ceil((currentRS × n − Σscores_kept) / mult)` per team, live',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H12',
    name: 'Live rank-if-ended-now',
    slug: 'fgc2026.live-rank-if-ended-now',
    description: 'Re-run `calculateRankings` with provisional details',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H13',
    name: 'Climb decision math',
    slug: 'fgc2026.climb-decision-math',
    description: 'Show `supp × 0.30` — the live value of one more Z3 climb',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'H14',
    name: 'Endgame projection at T−30',
    slug: 'fgc2026.endgame-projection-at-t-30',
    description:
      'Freeze suppression, project best/worst-case multiplier outcomes',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I1',
    name: 'Cycle time',
    slug: 'fgc2026.cycle-time',
    description: '`Match.cycleTime`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I2',
    name: 'Rolling avg cycle time',
    slug: 'fgc2026.rolling-avg-cycle-time',
    description: '`mean(cycleTime)` over trailing N matches',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I3',
    name: 'Schedule adherence',
    slug: 'fgc2026.schedule-adherence',
    description: '`actualStartTime − scheduledTime` per match',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I4',
    name: 'Cumulative drift',
    slug: 'fgc2026.cumulative-drift',
    description: 'Running `Σ` of I3 — ahead/behind for the day',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I5',
    name: 'Prestart-to-start',
    slug: 'fgc2026.prestart-to-start',
    description: '`actualStartTime − prestartTime`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I6',
    name: 'Field turnaround',
    slug: 'fgc2026.field-turnaround',
    description:
      '`prestartTime(n+1) − actualStartTime(n) − 150 s` per `fieldNumber`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I7',
    name: 'Matches played / remaining',
    slug: 'fgc2026.matches-played-remaining',
    description: '`count(result != RESULT_NOT_PLAYED)` vs total',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I8',
    name: 'Per-field score bias',
    slug: 'fgc2026.per-field-score-bias',
    description:
      '`mean(score)` grouped by `fieldNumber` — flags a miscalibrated field',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I9',
    name: 'Results commit latency',
    slug: 'fgc2026.results-commit-latency',
    description: '`updatedAtUtc − actualStartTime − 150 s`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'I10',
    name: 'Event ball throughput',
    slug: 'fgc2026.event-ball-throughput',
    description: '`Σ totalContained` / elapsed event hours',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J1',
    name: 'Country / flag',
    slug: 'fgc2026.country-flag',
    description: '`Team.country`, `countryCode`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J2',
    name: 'Robot name',
    slug: 'fgc2026.robot-name',
    description: '`Team.robotName` — lower third graphic',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J3',
    name: 'Rookie status',
    slug: 'fgc2026.rookie-status',
    description: '`rookieYear == currentSeason`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J4',
    name: 'Best rookie',
    slug: 'fgc2026.best-rookie',
    description: '`max(rankingScore)` among rookies',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J5',
    name: 'Best debut',
    slug: 'fgc2026.best-debut',
    description: "`max(score)` in a team's first match",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J6',
    name: 'Regional aggregate',
    slug: 'fgc2026.regional-aggregate',
    description: '`mean(rankingScore)` grouped by country/continent',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J7',
    name: 'Country head-to-head',
    slug: 'fgc2026.country-head-to-head',
    description: 'W-L between teams of two countries across shared matches',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J8',
    name: 'Never-climbed club',
    slug: 'fgc2026.never-climbed-club',
    description: 'Teams with `max(BraceState) == 0` all event',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J9',
    name: '100 % climb rate',
    slug: 'fgc2026.100-climb-rate',
    description: 'Teams with `BraceState > 0` in every match',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J10',
    name: 'Most improved',
    slug: 'fgc2026.most-improved',
    description: '`max(A41 trend slope)`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J11',
    name: 'Most frequent partner',
    slug: 'fgc2026.most-frequent-partner',
    description: '`mode(teamKeys sharing alliance)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J12',
    name: 'Never played together',
    slug: 'fgc2026.never-played-together',
    description: 'Team pairs with zero shared matches',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J13',
    name: 'Best / worst match',
    slug: 'fgc2026.best-worst-match',
    description: '`max` / `min(score)` per team, with the match name',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J14',
    name: 'Winning-alliance appearances',
    slug: 'fgc2026.winning-alliance-appearances',
    description: '`wins` (A27), framed as a count',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'J15',
    name: 'Geographic superlatives',
    slug: 'fgc2026.geographic-superlatives',
    description:
      'Northernmost/southernmost/smallest-nation team by `country` lookup',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K1',
    name: 'Alliance cumulative score',
    slug: 'fgc2026.alliance-cumulative-score',
    description:
      "`Σ` of that alliance's 4 playoff match scores (`calculatePlayoffsRankings`)",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K2',
    name: 'Alliance average',
    slug: 'fgc2026.alliance-average',
    description: '`K1 / 4`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K3',
    name: 'Alliance composition strength',
    slug: 'fgc2026.alliance-composition-strength',
    description: '`Σ rankingScore` of its 4 members at quals close',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K4',
    name: 'Seed vs performance',
    slug: 'fgc2026.seed-vs-performance',
    description: '`allianceSeed − playoffRank`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K5',
    name: 'Rotation pattern',
    slug: 'fgc2026.rotation-pattern',
    description: 'Which 3 of 4 played each match; `count` per team',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K6',
    name: 'Sit-out count',
    slug: 'fgc2026.sit-out-count',
    description: '`4 − matchesPlayed` per alliance member (T01: min 1 each)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K7',
    name: 'Random-draw impact',
    slug: 'fgc2026.random-draw-impact',
    description:
      "`mean(score)` of matches where the drawn 4th played vs didn't",
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K8',
    name: 'Captain performance',
    slug: 'fgc2026.captain-performance',
    description:
      '`rankingScore` of the 8 alliance captains vs their playoff results',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K9',
    name: 'Third-slot value',
    slug: 'fgc2026.third-slot-value',
    description: 'Contribution of the #17–#24 ranked members (Table 6-1)',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K10',
    name: 'Round-robin H2H',
    slug: 'fgc2026.round-robin-h2h',
    description: 'Result grid across the 16 playoff matches',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K11',
    name: 'Finals sum',
    slug: 'fgc2026.finals-sum',
    description: "`Σ` of each finalist's 2 finals scores",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K12',
    name: 'Clinch / elimination math',
    slug: 'fgc2026.clinch-elimination-math',
    description: 'Max remaining points vs current gap to 3rd',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'K13',
    name: 'Path-to-victory scenarios',
    slug: 'fgc2026.path-to-victory-scenarios',
    description: 'Enumerate remaining match outcomes → advancement probability',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L1',
    name: 'Margin decomposition',
    slug: 'fgc2026.margin-decomposition',
    description:
      '`margin = (redSupp×redMult − blueSupp×blueMult) + (redPartner − bluePartner) + foulΔ`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L2',
    name: 'The shared-terms fact',
    slug: 'fgc2026.the-shared-terms-fact',
    description:
      '`exting` and `coop` are identical for both alliances → they **cannot** affect the margin. Roughly a third of a typical score is mathematically incapable of deciding the match',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L3',
    name: 'Did the multiplier flip it?',
    slug: 'fgc2026.did-the-multiplier-flip-it',
    description: 'Recompute with `mult = 1.0` both sides; count result changes',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L4',
    name: 'Did partner climb flip it?',
    slug: 'fgc2026.did-partner-climb-flip-it',
    description:
      'Recompute with `partnerPts = 0` both sides; count result changes',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L5',
    name: 'Win rate by multiplier',
    slug: 'fgc2026.win-rate-by-multiplier',
    description: '`winRate` bucketed by `climbMultiplier` band',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L6',
    name: 'Win rate by suppression differential',
    slug: 'fgc2026.win-rate-by-suppression-differential',
    description: '`winRate` bucketed by `redSupp − blueSupp`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L7',
    name: 'Climb vs balls tradeoff',
    slug: 'fgc2026.climb-vs-balls-tradeoff',
    description:
      'Break-even: climbing to Z3 beats scoring N more balls when `supp × 0.30 > N`',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L8',
    name: 'Current drop match',
    slug: 'fgc2026.current-drop-match',
    description: "The match each team's RS is currently discarding",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L9',
    name: 'Next drop threshold',
    slug: 'fgc2026.next-drop-threshold',
    description:
      '`min(kept scores)` — the score a new match must beat to matter',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L10',
    name: 'Ranking sensitivity',
    slug: 'fgc2026.ranking-sensitivity',
    description: '`∂rank / ∂score` — how many points move a team one rank',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L11',
    name: 'Bubble watch',
    slug: 'fgc2026.bubble-watch',
    description:
      'Teams within one match of the rank-8 / rank-24 / rank-25 boundaries (Table 6-1)',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L12',
    name: 'Partner-luck spread',
    slug: 'fgc2026.partner-luck-spread',
    description: '`stdev(partner OPR)` per team — who drew hard',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L13',
    name: 'Correlation matrix',
    slug: 'fgc2026.correlation-matrix',
    description: 'Pearson `r` across climb rate, suppression OPR, RS, win %',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'L14',
    name: 'What decided each match',
    slug: 'fgc2026.what-decided-each-match',
    description: 'Per match, the single largest term in L1',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M1',
    name: 'Revisions per match',
    slug: 'fgc2026.revisions-per-match',
    description: '`count(match_history_base)` for that match key',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M2',
    name: 'Post-buzzer revisions',
    slug: 'fgc2026.post-buzzer-revisions',
    description: 'Revisions with `occurredAtUtc > actualStartTime + 150 s`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M3',
    name: 'Score correction magnitude',
    slug: 'fgc2026.score-correction-magnitude',
    description:
      '`Σ abs(redScore(rev n) − redScore(rev n−1))` over post-buzzer revisions',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M4',
    name: 'Net score correction',
    slug: 'fgc2026.net-score-correction',
    description:
      '`score(max revision) − score(first post-buzzer revision)`, signed',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M5',
    name: 'Most-corrected field',
    slug: 'fgc2026.most-corrected-field',
    description:
      'Frequency of each changed column across consecutive `match_detail_history` snapshots (snapshot diffs, not raw events — raw events double-count the LED/ball pair)',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M6',
    name: 'Time to final score',
    slug: 'fgc2026.time-to-final-score',
    description:
      '`max(occurredAtUtc) − actualStartTime` over `match_history_base`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M7',
    name: 'Scoring settle time',
    slug: 'fgc2026.scoring-settle-time',
    description:
      '`occurredAtUtc` of the last revision that *changed* `red/blueScore`, − buzzer',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M8',
    name: 'Entries per referee',
    slug: 'fgc2026.entries-per-referee',
    description: '`count(match_action_event) GROUP BY actorId`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M9',
    name: 'Referee press cadence',
    slug: 'fgc2026.referee-press-cadence',
    description:
      'Median gap between consecutive events by the same `actorId` on the same `fieldPath`',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M10',
    name: 'Average edit size',
    slug: 'fgc2026.average-edit-size',
    description:
      '`mean(abs(newValue − oldValue))` on suppression fields — do refs tap `+1` or type totals?',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M11',
    name: 'Referee back-out rate',
    slug: 'fgc2026.referee-back-out-rate',
    description: '`count(newValue < oldValue) / count(all detail events)`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M12',
    name: 'Action↔snapshot reconciliation',
    slug: 'fgc2026.action-snapshot-reconciliation',
    description:
      "Last `newValueJson` for a `fieldPath` vs that column's final snapshot value. A mismatch ⇒ dropped events (see caveat 2)",
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M13',
    name: 'Unpersisted action count',
    slug: 'fgc2026.unpersisted-action-count',
    description:
      '`count(persisted = 0)` / `count(revision IS NULL)` — data-loss canary, per match and per field',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M14',
    name: 'Realtime → API latency',
    slug: 'fgc2026.realtime-api-latency',
    description:
      '`match_history_base.occurredAtUtc` − `match_action_event.occurredAtUtc` joined on `correlationId`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M15',
    name: 'Match state at time T',
    slug: 'fgc2026.match-state-at-time-t',
    description:
      'Replay `match_action_event` ordered by `occurredAtUtc` up to `T`, applying each `newValueJson` onto the last snapshot at or before `T`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M16',
    name: 'Score-at-any-second curve',
    slug: 'fgc2026.score-at-any-second-curve',
    description:
      'Run `calculateScore()` over each M15 replay state at 1 s steps → full in-match score graph for both alliances',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M17',
    name: 'Live margin curve',
    slug: 'fgc2026.live-margin-curve',
    description:
      'M16 applied to the L1 margin identity — shows exactly when the lead changed hands',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M18',
    name: 'Lead changes per match',
    slug: 'fgc2026.lead-changes-per-match',
    description: 'Count of sign flips in M17',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M19',
    name: 'Largest deficit overcome',
    slug: 'fgc2026.largest-deficit-overcome',
    description:
      '`max` of `(losing-side deficit)` in M17 for the alliance that ultimately won',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M20',
    name: 'Extinguisher write contention',
    slug: 'fgc2026.extinguisher-write-contention',
    description:
      '`details.wildfireInExtinguisher` written by two distinct `actorId` values inside a short window — the three-writer race in consequence 4',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M21',
    name: 'Referee workload by field',
    slug: 'fgc2026.referee-workload-by-field',
    description:
      '`count(match_action_event) GROUP BY clientId` joined to `match.fieldNumber`',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M22',
    name: 'Head-ref override rate',
    slug: 'fgc2026.head-ref-override-rate',
    description:
      'Revisions with `actionType = MATCH_PATCH` and `source` ≠ the realtime source, ÷ all revisions',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M23',
    name: 'Which ref called which match',
    slug: 'fgc2026.which-ref-called-which-match',
    description:
      '`distinct actorName` per match — the credit roll / accountability trail',
    family: 'EMS',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M24',
    name: 'Contested match index',
    slug: 'fgc2026.contested-match-index',
    description:
      'Composite: M1 + M3 + M11 + G14 — "how much did this match get argued about"',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M25',
    name: 'Event-wide correction rate',
    slug: 'fgc2026.event-wide-correction-rate',
    description:
      '`Σ M2 / Σ M1` across all matches — a data-quality KPI for the event',
    family: 'DER',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M26',
    name: 'Coopertition flip timing',
    slug: 'fgc2026.coopertition-flip-timing',
    description:
      '`coopertition` is computed, never entered — take the `occurredAtUtc` of the `*BraceState` event that pushed the global Z3 count across 4 / 5 / 6, − `actualStartTime`',
    family: 'REF',
    seasonKey: 'fgc_2026'
  },
  {
    catalogueId: 'M27',
    name: 'Multiplier trajectory',
    slug: 'fgc2026.multiplier-trajectory',
    description:
      '`red/blueClimbMultiplier` value at each revision, plotted over match-relative time',
    family: 'REF',
    seasonKey: 'fgc_2026'
  }
] as const;
