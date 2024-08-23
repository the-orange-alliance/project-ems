import { Lock, MenuBook, Restaurant, StarBorder } from '@mui/icons-material';
import { ResultsBreakdown } from '../../displays';
import {
  getBalancedRobots,
  getCoopertitionPoints,
  getFoodProducedPoints,
  getFoodSecuredPoints,
  getNexusPoints,
  getResevoirPoints,
  MatchDetails,
  ScoreTable
} from '@toa-lib/models/build/seasons/FeedingTheFuture';
import CoopertitionLogo from '../fgc_default/assets/Coopertition_Points.svg';
import Resevoir from './assets/Resevoir.svg';
import Nexus from './assets/Nexus.svg';
import styled from '@emotion/styled';
import { Icon } from '@mui/material';

const CustomIcon = styled(Icon)(() => {
  return {
    display: 'inline-flex',
    fontSize: 'inherit'
  };
});

export const Breakdown: ResultsBreakdown<MatchDetails>[] = [
  {
    icon: (
      <CustomIcon>
        <img src={Resevoir} />
      </CustomIcon>
    ),
    title: 'Resevoir Points',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return '0';
      const [redResevoirPoints, blueResevoirPoints] = getResevoirPoints(
        match.details
      );
      const pts = alliance === 'red' ? redResevoirPoints : blueResevoirPoints;
      return pts > 0 ? `+${pts}` : `${pts}`;
    }
  },
  {
    icon: (
      <CustomIcon>
        <img src={Nexus} />
      </CustomIcon>
    ),
    title: 'Nexus Points',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return '0';
      const [redNexusPoints, blueNexusPoints] = getNexusPoints(match.details);
      const pts = alliance === 'red' ? redNexusPoints : blueNexusPoints;
      return pts > 0 ? `+${pts}` : `${pts}`;
    }
  },
  {
    icon: <Restaurant fontSize='inherit' />,
    title: 'Food Produced Points',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return '0';
      const [redFoodProduced, blueFoodProduced] = getFoodProducedPoints(
        match.details
      );
      const pts = alliance === 'red' ? redFoodProduced : blueFoodProduced;
      return pts > 0 ? `+${pts}` : `${pts}`;
    }
  },
  {
    icon: <StarBorder fontSize='inherit' />,
    title: 'Bonus Multiplier',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return 'x1 (+0)';
      const nBalanced = getBalancedRobots(match.details);
      const mult = ScoreTable.BalanceMultiplier(nBalanced);

      // Fetch all the individual point categories
      const [redResevoirPoints, blueResevoirPoints] = getResevoirPoints(
        match.details
      );
      const [redNexusPoints, blueNexusPoints] = getNexusPoints(match.details);
      const [redFoodProduced, blueFoodProduced] = getFoodProducedPoints(
        match.details
      );
      const totalPoints =
        alliance === 'red'
          ? redResevoirPoints + redNexusPoints + redFoodProduced
          : blueResevoirPoints + blueNexusPoints + blueFoodProduced;
      // This may be slightly off due to rounding errors? please no one complain...
      // ideally, we should calc this in the backend and pass it up.  OR.... we omit the "(+n)" part of the score display
      // TODO: revisit?
      const totalAdded = totalPoints * mult - totalPoints;

      return `x${mult} (+${totalAdded})`;
    }
  },
  {
    icon: <Lock fontSize='inherit' />,
    title: 'Food Secured Points',
    color: '#000000',
    resultCalc: (match, alliance) => {
      if (!match.details) return '0';
      const [redFoodSecured, blueFoodSecured] = getFoodSecuredPoints(
        match.details
      );
      const pts = alliance === 'red' ? redFoodSecured : blueFoodSecured;
      return pts > 0 ? `+${pts}` : `${pts}`;
    }
  },
  {
    icon: (
      <CustomIcon>
        <img src={CoopertitionLogo} />
      </CustomIcon>
    ),
    title: 'Coopertition Bonus',
    color: '#000000',
    resultCalc: (match) => {
      if (!match.details) return '0';
      const pts = getCoopertitionPoints(match.details);
      return pts > 0 ? `+${pts}` : `${pts}`;
    }
  }
];
