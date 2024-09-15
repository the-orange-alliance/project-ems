import { FeedingTheFuture } from '@toa-lib/models';
import { SeasonComponents } from '..';
import ScoreSheet from './referee/ScoreSheet';
import { MatchDetailInfo } from './match-detail-info';
import { RedScoreBreakdown, BlueScoreBreakdown } from './score-breakdowns';
import { RankingsReport } from './rankings-report';
import { Settings } from './settings';
import { useFieldControl } from './field-control';
import HeadRefExtrasSheet from './referee/HRExtra';

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
