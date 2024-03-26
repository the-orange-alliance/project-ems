import {
  Match,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { FC } from 'react';
import { useComponents } from 'src/seasons';

interface Props {
  match: Match<any>;
  onUpdate: (match: Match<any>) => void;
}

export const MatchDetailTab: FC<Props> = ({ match, onUpdate }) => {
  const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
  const components = useComponents(seasonKey);
  const handleUpdates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, name, type } = e.target;
    const typedValue = type === 'number' ? parseInt(value) : value;
    const details = {
      ...match.details,
      [name]: typedValue
    };
    const newMatch = { ...match, details };
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (!functions) return;
    const [redScore, blueScore] = functions.calculateScore(newMatch);
    onUpdate({ ...newMatch, redScore, blueScore });
  };
  return components?.MatchDetailInfo ? (
    <components.MatchDetailInfo match={match} handleUpdates={handleUpdates} />
  ) : null;
};
