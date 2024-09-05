import { FeedingTheFuture } from '@toa-lib/models';
import { SeasonComponents } from '..';
import { MatchDetailInfo } from './match-detail-info';
import { RedScoreBreakdown, BlueScoreBreakdown } from './score-breakdowns';
import { RankingsReport } from './rankings-report';
import { Settings } from './settings';
import { useFieldControl } from './field-control';

export const fgc2024Components: SeasonComponents<
  FeedingTheFuture.MatchDetails,
  FeedingTheFuture.SeasonRanking
> = {
  MatchDetailInfo,
  RedScoreBreakdown,
  BlueScoreBreakdown,
  RefereeScoreSheet: () => <div>RefereeScoreSheet</div>,
  RankingsReport,
  Settings,
  useFieldControl
};
