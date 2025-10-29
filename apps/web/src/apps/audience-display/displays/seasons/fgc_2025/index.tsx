import { Lock, Restaurant, StarBorder } from '@mui/icons-material';
import { ResultsBreakdown } from '../../displays.js';
import { EcoEquilibrium } from '@toa-lib/models';
import CoopertitionLogo from '../fgc_default/assets/Coopertition_Points.svg';
import styled from '@emotion/styled';
import { Icon } from '@mui/material';

const CustomIcon = styled(Icon)(() => {
  return {
    display: 'inline-flex',
    fontSize: 'inherit'
  };
});

export const RegionalBreakdownFGC25: ResultsBreakdown<EcoEquilibrium.MatchDetails>[] =
  [
    {
      icon: <Lock fontSize='inherit' />,
      title: 'Protection Multiplier',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return 'Not Even';
        return alliance === 'red'
          ? `x${match.details.redProtectionMultiplier.toFixed(2)}`
          : `x${match.details.blueProtectionMultiplier.toFixed(2)}`;
      }
    }
  ];

export const GlobalBreakdownFGC25: ResultsBreakdown<EcoEquilibrium.MatchDetails>[] =
  [
    {
      icon: <Lock fontSize='inherit' />,
      title: 'Barrier Points',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return '0';
        return `${match.details.barriersInRedMitigator + match.details.barriersInBlueMitigator}`;
      }
    },
    {
      icon: <Lock fontSize='inherit' />,
      title: 'Biodiversity Points',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return '0';
        return `${match.details.biodiversityUnitsBlueSideEcosystem + match.details.biodiversityUnitsRedSideEcosystem + match.details.biodiversityUnitsCenterEcosystem}`;
      }
    },
    {
      icon: <Lock fontSize='inherit' />,
      title: 'Distribution Factor',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return 'Not Even';
        switch (match.details.biodiversityDistributionFactor.toFixed(2)) {
          case (1 / (1 + EcoEquilibrium.DistributionFactor.Even)).toFixed(2):
            return `Even (x${EcoEquilibrium.DistributionFactor.Even.toFixed(2)})`;
          case (
            1 /
            (1 + EcoEquilibrium.DistributionFactor.SomewhatEven)
          ).toFixed(2):
            return `Somewhat Even (x${EcoEquilibrium.DistributionFactor.SomewhatEven.toFixed(2)})`;
          default:
            return `Not Even (x${EcoEquilibrium.DistributionFactor.NotEven.toFixed(2)})`;
        }
      }
    },
    {
      icon: <Lock fontSize='inherit' />,
      title: 'Coopertition Bonus',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return 'None (+0)';
        switch (match.details.coopertition) {
          case EcoEquilibrium.CoopertitionBonus.Full:
            return `Full (+${EcoEquilibrium.CoopertitionBonus.Full})`;
          case EcoEquilibrium.CoopertitionBonus.Partial:
            return `Partial (+${EcoEquilibrium.CoopertitionBonus.Partial})`;
          default:
            return `None (+${EcoEquilibrium.CoopertitionBonus.None})`;
        }
      }
    }
  ];
