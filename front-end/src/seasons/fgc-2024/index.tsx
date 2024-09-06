import { FeedingTheFuture } from '@toa-lib/models';
import { SeasonComponents } from '..';
import ScoreSheet from './referee/ScoreSheet';

export const fgc2024Components: SeasonComponents<
  FeedingTheFuture.MatchDetails,
  FeedingTheFuture.SeasonRanking
> = {
  MatchDetailInfo: () => <div>MatchDetailInfo</div>,
  RedScoreBreakdown: () => <div>RedScoreBreakdown</div>,
  BlueScoreBreakdown: () => <div>BlueScoreBreakdown</div>,
  RefereeScoreSheet: ScoreSheet,
  RankingsReport: () => <div>RankingsReport</div>
};
