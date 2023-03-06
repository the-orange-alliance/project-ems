import { FC, ChangeEvent } from 'react';
import { useRecoilState } from 'recoil';
import { matchByCurrentIdSelectorFam } from 'src/stores/NewRecoil';
import {
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { useSeasonComponents } from 'src/seasons';

interface Props {
  id: number;
}

const MatchDetailInfo: FC<Props> = ({ id }) => {
  const [match, setMatch] = useRecoilState(matchByCurrentIdSelectorFam(id));

  if (!match) return null;

  const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
  const components = useSeasonComponents(seasonKey);

  const handleUpdates = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, name, type } = e.target;
    const typedValue = type === 'number' ? parseInt(value) : value;
    const details = {
      ...match.details,
      [name]: typedValue
    };
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (!functions) return;
    const [redScore, blueScore] = functions.calculateScore({
      ...match,
      details
    });
    if (match) {
      setMatch({ ...match, details, redScore, blueScore });
    }
  };

  return components?.MatchDetailInfo ? (
    <components.MatchDetailInfo match={match} handleUpdates={handleUpdates} />
  ) : null;
};

export default MatchDetailInfo;
