import { FeedingTheFuture } from '@toa-lib/models';
import { SeasonComponents } from '..';

export const fgc2024Components: SeasonComponents<
  FeedingTheFuture.MatchDetails,
  FeedingTheFuture.SeasonRanking
> = {
  MatchDetailInfo: () => <div>MatchDetailInfo</div>,
  RedScoreBreakdown: () => <div>RedScoreBreakdown</div>,
  BlueScoreBreakdown: () => <div>BlueScoreBreakdown</div>,
  RefereeScoreSheet: () => <div>RefereeScoreSheet</div>,
  RankingsReport: () => <div>RankingsReport</div>
};
