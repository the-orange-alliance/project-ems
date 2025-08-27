import { FeedingTheFuture } from '@toa-lib/models';
import { SeasonComponents } from '../index.js';
import ScoreSheet from './referee/ScoreSheet.js';
import { MatchDetailInfo } from './match-detail-info.js';
import { RedScoreBreakdown, BlueScoreBreakdown } from './score-breakdowns.js';
import { RankingsReport } from './rankings-report.js';
import { Settings } from './settings.js';
import { useFieldControl } from './field-control.js';
import HeadRefExtrasSheet from './referee/HRExtra.js';

export const fgc2024Components: SeasonComponents<
  FeedingTheFuture.MatchDetails,
  FeedingTheFuture.SeasonRanking
> = {
  RefereeScoreSheet: ScoreSheet,
  MatchDetailInfo,
  RedScoreBreakdown,
  BlueScoreBreakdown,
  RankingsReport,
  HeadRefExtrasSheet,
  Settings,
  useFieldControl
};
