import { FireOutlined } from '@ant-design/icons';
import { ResultsBreakdown } from '../../displays.js';
import { IgnitingInnovation } from '@toa-lib/models';

export const RegionalBreakdownFGC26: ResultsBreakdown<IgnitingInnovation.MatchDetails>[] =
  [
    {
      icon: <FireOutlined style={{ fontSize: 'inherit' }} />,
      title: 'Suppression Unit',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return '0';
        return alliance === 'red'
          ? `${match.details.wildfireInRedSuppressionUnit}`
          : `${match.details.wildfireInBlueSuppressionUnit}`;
      }
    },
    {
      icon: <FireOutlined style={{ fontSize: 'inherit' }} />,
      title: 'Climb Multiplier',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return 'x0.00';
        return alliance === 'red'
          ? `x${match.details.redClimbMultiplier.toFixed(2)}`
          : `x${match.details.blueClimbMultiplier.toFixed(2)}`;
      }
    },
    {
      icon: <FireOutlined style={{ fontSize: 'inherit' }} />,
      title: 'Partner Climb',
      color: '#000000',
      resultCalc: (match, alliance) => {
        if (!match.details) return '0';
        return alliance === 'red'
          ? `${match.details.redPartnerClimbPoints}`
          : `${match.details.bluePartnerClimbPoints}`;
      }
    }
  ];

export const GlobalBreakdownFGC26: ResultsBreakdown<IgnitingInnovation.MatchDetails>[] =
  [
    {
      icon: <FireOutlined style={{ fontSize: 'inherit' }} />,
      title: 'Extinguisher Points',
      color: '#000000',
      resultCalc: (match) => {
        if (!match.details) return '0';
        return `${match.details.wildfireInExtinguisher}`;
      }
    },
    {
      icon: <FireOutlined style={{ fontSize: 'inherit' }} />,
      title: 'Coopertition Bonus',
      color: '#000000',
      resultCalc: (match) => {
        if (!match.details) return 'None (+0)';
        switch (match.details.coopertition) {
          case IgnitingInnovation.CoopertitionBonus.Six:
            return `6 Robots (+${IgnitingInnovation.CoopertitionBonus.Six})`;
          case IgnitingInnovation.CoopertitionBonus.Five:
            return `5 Robots (+${IgnitingInnovation.CoopertitionBonus.Five})`;
          case IgnitingInnovation.CoopertitionBonus.Four:
            return `4 Robots (+${IgnitingInnovation.CoopertitionBonus.Four})`;
          default:
            return `None (+${IgnitingInnovation.CoopertitionBonus.None})`;
        }
      }
    }
  ];
