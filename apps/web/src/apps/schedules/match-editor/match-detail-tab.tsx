import {
  Match,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { Col } from 'antd';
import { FC } from 'react';
import { useComponents } from 'src/seasons/index.js';

interface Props {
  match: Match<any>;
  onUpdate: (match: Match<any>) => void;
}

export const MatchDetailTab: FC<Props> = ({ match, onUpdate }) => {
  const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
  const components = useComponents(seasonKey);

  const handleUpdates = (key: any, value: any) => {
    const details = {
      ...match.details,
      [key]: value
    };
    const newMatch = { ...match, details };
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (!functions) return;
    newMatch.details = functions.calculateRankingPoints?.(newMatch.details);

    console.log(newMatch);
    const [redScore, blueScore] = functions.calculateScore(newMatch);
    onUpdate({
      ...newMatch,
      redScore,
      blueScore
    });
  };

  return components ? (
    <Col>
      {components.RedScoreBreakdown && (
        <components.RedScoreBreakdown
          match={match}
          handleUpdates={handleUpdates}
        />
      )}
      {components.BlueScoreBreakdown && (
        <components.BlueScoreBreakdown
          match={match}
          handleUpdates={handleUpdates}
        />
      )}
      {components.CustomBreakdown && (
        <components.CustomBreakdown
          match={match}
          handleUpdates={handleUpdates}
        />
      )}
    </Col>
  ) : null;
};
