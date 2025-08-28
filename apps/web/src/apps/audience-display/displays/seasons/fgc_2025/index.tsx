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

export const BreakdownFGC25: ResultsBreakdown<EcoEquilibrium.MatchDetails>[] = [
  {
    icon: <StarBorder fontSize='inherit' />,
    title: 'Barriers',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return 'x1 (+0)';
      return `${match.details.barriersInBlueMitigator + match.details.barriersInRedMitigator}`;
    }
  },
  {
    icon: <StarBorder fontSize='inherit' />,
    title: 'Biodiversity',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return 'x1 (+0)';
      return `${match.details.biodiversityUnitsRedSideEcosystem + match.details.biodiversityUnitsBlueSideEcosystem + match.details.biodiversityUnitsCenterEcosystem}`;
    }
  },
  {
    icon: <Lock fontSize='inherit' />,
    title: 'Distribution Factor',
    color: '#000000',
    resultCalc: (match) => {
      if (!match.details) return 'Not Even';
      switch (match.details.biodiversityDistributionFactor) {
        case EcoEquilibrium.DistributionFactor.Even:
          return `Even (x${match.details.biodiversityDistributionFactor})`;
        case EcoEquilibrium.DistributionFactor.SomewhatEven:
          return `Somewhat Even (x${match.details.biodiversityDistributionFactor})`;
        case EcoEquilibrium.DistributionFactor.NotEven:
          return `Not Even (x${match.details.biodiversityDistributionFactor})`;
        default:
          return 'Unknown';
      }
    }
  },
  {
    icon: <Lock fontSize='inherit' />,
    title: 'Protection Multiplier',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return 'Not Even';
      return alliance === 'red' ? `${match.details.redProtectionMultiplier}` : `${match.details.blueProtectionMultiplier}`;
    }
  },
  {
    icon: (
      <CustomIcon>
        <img alt='co-op logo' src={CoopertitionLogo} />
      </CustomIcon>
    ),
    title: 'Coopertition Bonus',
    color: '#000000',
    resultCalc: (match) => {
      if (!match.details) return '0';
      const pts = match.details.coopertition || 0;
      return pts > 0 ? `+${pts}` : `${pts}`;
    }
  }
];
