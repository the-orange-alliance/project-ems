import { EcoEquilibrium } from '@toa-lib/models';
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

export const fgc2025Components: SeasonComponents<
  EcoEquilibrium.MatchDetails,
  EcoEquilibrium.SeasonRanking
> = {
  useFieldControl,
  CustomBreakdown: CombinedBreakdown,
  RedScoreBreakdown: RedScoreBreakdown,
  BlueScoreBreakdown: BlueScoreBreakdown,
  RefereeScoreSheet: ScoreSheet,
  HeadRefExtrasSheet: HeadRefereeExtra,
  Settings: Settings,
  FieldMonitorExtra: FieldMonitorExtra,
  FieldMonitorExtraMinimal: FieldMonitorExtraMinimal
};
