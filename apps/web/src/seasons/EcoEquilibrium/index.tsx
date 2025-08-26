import { EcoEquilibrium } from '@toa-lib/models';
import { SeasonComponents } from '..';
import { useFieldControl } from './field-control';

export const ecoEquilibriumComponents: SeasonComponents<
  EcoEquilibrium.MatchDetails,
  EcoEquilibrium.SeasonRanking
> = {
  useFieldControl
};
