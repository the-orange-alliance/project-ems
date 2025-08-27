import { EcoEquilibrium } from '@toa-lib/models';
import { useFieldControl } from './field-control.js';
import { SeasonComponents } from '../index.js';
import { BlueScoreBreakdown, RedScoreBreakdown, CombinedBreakdown } from './score-breakdowns.js';

export const fgc2025Components: SeasonComponents<
  EcoEquilibrium.MatchDetails,
  EcoEquilibrium.SeasonRanking
> = {
  useFieldControl,
  CustomBreakdown: CombinedBreakdown,
  RedScoreBreakdown: RedScoreBreakdown,
  BlueScoreBreakdown: BlueScoreBreakdown,
  RefereeScoreSheet: null
};
