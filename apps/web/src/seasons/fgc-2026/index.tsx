import { IgnitingInnovation } from '@toa-lib/models';
import { useFieldControl } from './field-control.js';
import { SeasonComponents } from '../index.js';
import {
  BlueScoreBreakdown,
  RedScoreBreakdown,
  CombinedBreakdown
} from './score-breakdowns.js';
import ScoreSheet from './referee/ScoreSheet.js';
import HeadRefereeExtra from './referee/HRExtra.js';
import { Settings } from './settings.js';
import { FieldMonitorExtra } from './fieldMonitorExtra.js';
import { FieldMonitorExtraMinimal } from './fieldMonitorExtraMinimal.js';
import { RankingsReport } from './rankings-report.js';

export const fgc2026Components: SeasonComponents<
  IgnitingInnovation.MatchDetails,
  IgnitingInnovation.SeasonRanking
> = {
  useFieldControl,
  CustomBreakdown: CombinedBreakdown,
  RedScoreBreakdown: RedScoreBreakdown,
  BlueScoreBreakdown: BlueScoreBreakdown,
  RefereeScoreSheet: ScoreSheet,
  HeadRefExtrasSheet: HeadRefereeExtra,
  MatchDetailInfo: CombinedBreakdown,
  Settings: Settings,
  FieldMonitorExtra: FieldMonitorExtra,
  FieldMonitorExtraMinimal: FieldMonitorExtraMinimal,
  RankingsReport: RankingsReport
};
