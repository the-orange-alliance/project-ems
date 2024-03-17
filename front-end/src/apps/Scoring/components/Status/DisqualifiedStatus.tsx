import { FC } from 'react';
import { Checkbox } from '@mui/material';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  matchInProgressParticipantsByStationSelectorFam,
  matchStateAtom
} from 'src/stores/NewRecoil';
import { MatchState } from '@toa-lib/models';

interface Props {
  station: number;
}

const DisqualifiedStatus: FC<Props> = ({ station }) => {
  const [participant, setParticipant] = useRecoilState(
    matchInProgressParticipantsByStationSelectorFam(station)
  );
  const matchState = useRecoilValue(matchStateAtom);
  const disabled = matchState !== MatchState.PRESTART_READY;

  const toggle = () => {
    if (participant) {
      const newParticipant = Object.assign({}, participant);
      newParticipant.disqualified = participant.disqualified === 1 ? 0 : 1;
      setParticipant(newParticipant);
    }
  };
  return (
    <Checkbox
      disabled={disabled}
      checked={participant?.disqualified === 1}
      onChange={toggle}
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    />
  );
};

export default DisqualifiedStatus;
