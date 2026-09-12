# FGC2026 statistics: formulas and model version 1

The catalogue is implemented as 232 public registrations. The public slug is stable; A1-M27 remain metadata. Result shapes and parameters are published by the catalogue endpoint. Parameter defaults, filters and selectors are part of the SHA-256 identity. Formula version is separate from that identity so an old good result can serve while its replacement is calculated.

## Published formulations

- [The Blue Alliance: The Math Behind OPR](https://blog.thebluealliance.com/2017/10/05/the-math-behind-opr-an-introduction/) supplies the alliance participation least-squares model. OPR fits own score, DPR fits opponent score, and CCWM fits own minus opponent score. Their linear identity is DPR = OPR - CCWM.
- [ml-matrix](https://github.com/mljs/matrix) supplies the SVD solver, with automatic transposition for underdetermined matrices. The installed dependency is 6.12.1. We use its singular-value threshold and minimum-norm behavior; no normal-equation Gaussian elimination is used.
- [Statbotics' EPA description](https://github.com/avgupta456/statbotics/blob/master/frontend/src/pages/blog/epa/index.tsx) and [its simplified total-score implementation](https://github.com/avgupta456/statbotics/blob/master/models/epa_model.py) motivate the points-space alliance-error update. A10 deliberately implements the catalogue's event-local, fixed-rate EWMA specialization, not all of Statbotics' cross-year, dynamic-rate, margin, and component machinery.
- [Weng and Lin, 2011](https://jmlr.org/papers/v12/weng11a.html), Algorithm 1, and [OpenSkill's Bradley-Terry implementation](https://openskill.me/en/stable/_modules/openskill/models/weng_lin/bradley_terry_full.html) define A15. A15 chooses the Bradley-Terry alternative in the catalogue; it does not claim to implement Microsoft's TrueSkill.
- [Statbotics' Elo recap](https://github.com/avgupta456/statbotics/blob/master/frontend/src/pages/blog/epa/index.tsx) describes summing team ratings into alliance ratings. A13 uses the catalogue's win/tie/loss Elo update, not Statbotics' score-margin Elo adaptation.

## Constants and numerical policies

| Engine | Version 1 behavior |
|---|---|
| OPR/DPR/CCWM | At least one complete alliance observation; SVD minimum norm. Rank and column count are returned. Rank deficiency explicitly warns that individual contributions are not identifiable. |
| Adjusted OPR | Minimize squared residual plus lambda times squared distance from the field-mean per-team score. Default lambda 1, allowed 0-1000. Solve the augmented matrix with SVD. |
| A9 iterative OPR | Start at SVD OPR, solve the remaining residual with the same SVD matrix, add the correction, stop below 1e-8 maximum correction or after 50 iterations. This is the catalogue's explicitly named residual refinement, not a claimed standardized distinct iOPR model. In exact arithmetic it equals the initial least-squares solution. |
| Elo | Prior 1500, alliance sum, logistic base 10 with scale 400, K = 32 per participating team; win 1, tie 0.5, loss 0. Updates are simultaneous from pre-match ratings. |
| EPA | Initialize to the first completed match's mean alliance score divided by alliance size. K = 0.3, update each team by K * alliance error / alliance size. This fixed K is the catalogue specialization of the published EWMA family. No prior-season data, rookie adjustment, or playoff weighting is invented. |
| Component EPA | Same EPA engine, independently on suppression balls, multiplier increment and partner-climb points. Predicted score multiplies estimated suppression by estimated multiplier, adds partner points and one shared-term expectation. Penalties are not predicted. |
| Normalized EPA | Event-field z-score, using sample standard deviation. It is not Statbotics' historical unitless or cross-season normalized EPA scale. Zero variance is insufficient data. |
| Bradley-Terry | mu = 25, sigma = 25/3, beta = 25/6, tau = 25/300, kappa = 0.0001. Inflate individual sigma squared by tau squared before each match; c squared = red alliance variance + blue alliance variance + 2 beta squared. Gamma = alliance sigma / c. Ties score 0.5. Return individual mu and sigma. |
| Win probabilities | Logistic natural-exponential scale 50 score points. This is an explicit initial calibration constant, not an empirically validated FGC2026 model. Live scale decreases with sqrt(timeRemaining/150), floored at 1. At a captured finish, score determines 0/0.5/1. |
| Simulation | Mulberry32 PRNG. Explicit uint32 seed or first eight hex characters of normalized-query SHA-256. Default 1000 samples; 100-10000 allowed. Empirical per-team contribution bootstrap for A19; empirical alliance score bootstrap for K13. Quantiles interpolate at (n-1)p. |
| Samples | Means require one observation; sample standard deviation, regression slope and Pearson correlation require two. Zero denominators and zero correlation variance yield missing values, never synthetic zero. |
| Ordering | Actual start time, tournament key, match ID. Pre-match predictions train only on earlier matches; unseen scheduled teams have insufficient data. Brier and upset evaluation exclude matches without prior observations for every participant. |
| Rankings | Drop exactly one lowest eligible score when at least two exist; exclude red-card scores from numerator and denominator, retain white-card zero, exclude surrogates and disqualifications. Ties do not count as losses. Compare RS, highest score, climb points, then team key for deterministic display order. |
| Contributions | Per-team ball attribution does not exist. A22/A23 and score-distribution samples are model residual allocations, not measured robot production. |

The FGC2026 engine calls the existing season calculateScore function. Score breakdowns expose unrounded terms and, where needed, a separate ceiling-rounding term. Shared extinguisher/coopertition points cancel directly; opponent-scaled fouls and final rounding can still transmit shared points into the margin. Multiplier-only counterfactuals preserve the original shared term when calling the scorer.

## Interpretation and incomplete data

- Only final current match rows count as played. The audit stream is used for state/revision metrics and live replay; historical revisions never become duplicate played matches.
- Models require complete equal-sized alliances. FGC2026 supplies alliance size three to the portable engine. Surrogates remain physical contributors for models; official ranking eligibility excludes them. No-shows remain scheduled participants and are reported separately. Disqualified alliance observations are excluded from model training.
- Match IDs repeat across tournaments. A match selector with multiple matching tournaments is unavailable until narrowed by tournament key.
- Timing uses lifecycle clock anchors; actualStartTime plus the nominal 150 seconds is a warned fallback. Abort/end anchors bound replay curves, with a one-hour safety limit for malformed prolonged histories. Referee timestamps are entry times, not physical sensor times.
- Physical count cleanup excludes approximate LED mirror fields. Typed digit-prefix intermediates on the same match, actor, client, socket and field collapse within 1000 ms. Genuine unit steps remain separate. Equal timestamps order by actionEventId.
- Reconciliation compares terminal action values against authoritative snapshots and emits warnings. It never invents missing presses or rewrites final source data.
- Carrier inference includes only uniquely identifiable carriers. Two braced robots do not identify which robot carried a partner.
- K2/K6 require four observed playoff matches and K11 two finals matches. K3/K8/K9 consume qualification ranking dependencies. These are current qualification rankings; the database has no frozen qualification-close ranking snapshot, so the result carries a provenance warning. Missing membership, drawn member, qualifying rank, or score samples gives an unavailable value.
- K12 gives a penalty-free bounded scenario. Penalty counts have no finite upper bound, so an unconditional clinch cannot honestly be certified. K13 is a seeded score-bootstrap advancement estimate (top two, seed breaks equal simulated totals), not an exact probability model of future fouls.
- L11 computes one-additional-match reachability using 0-1065 penalty-free scores with other teams held fixed and ties included optimistically. This ceiling is a schema bound, not a guarantee that all simultaneous climbing states are physically attainable.
- M14 measures action-to-revision association delay. It is not network round-trip latency: batched referee edits wait for later persistence. Unassociated rows do not prove data loss.
- M22 recognizes realtime/referee/field-ui and scorekeeper/scorekeeper-ui/admin/direct-api distinctions when present. Missing, null, api, unknown and legacy source labels cannot identify overrides. Without at least two recognized source distinctions, M22 is unavailable.
- B17/B18 need a recorded field ratio. Current global FCS settings can be used with a historical-provenance warning; no absent ratio is silently replaced with 1.
- J15 uses country centroids and area, not actual team coordinates. The static dataset is mledoze/countries, retrieved 2026-09-08, version 1, under the [Open Database License](https://github.com/mledoze/countries/blob/master/LICENSE). Unknown countries remain unknown; workers make no network calls.

Every successful result is validated against its calculator-specific schema and a stricter plain, finite, acyclic JSON check. A top-level not_found, insufficient_data, unavailable, degraded result, thrown exception or invalid payload is never cached. Structured results can contain nullable measurements for individual entities; these values are explicitly missing, never numeric zero.

H1/H2 velocity isolates changes in physical wildfire counts with the current scoring factors held fixed; brace-only changes do not create ball velocity. H14 freezes at the captured endgame anchor or a warned nominal T-30 anchor. H11 finds the minimum additional whole balls that improve the rounded official ranking average, including the single-score drop, with current scoring factors fixed. Counts beyond available pieces describe a mathematical requirement, not physical feasibility.

K13 simulations and top-two selection run independently for each selected tournament, with numeric alliance seed breaking simulated ties. L10 describes an increase to an existing kept score with other teams held fixed; L11 describes one additional match. They do not predict other teams' future results.

Velocity windows use cleaned physical count replay, including window boundaries. M15 retains raw captured input states for exact entry-time inspection. Strength of schedule uses all selected scheduled rosters with ratings trained on played matches; unseen partners or opponents are insufficient data.
