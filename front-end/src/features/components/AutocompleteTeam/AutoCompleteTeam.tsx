import { FC } from 'react';
import { Team } from '@toa-lib/models';
import ParticipantDropdown from 'src/components/Dropdowns/ParticipantDropdown';

interface Props {
  teamKey: number | null;
  disabled?: boolean;
  onUpdate: (t: Team | null) => void;
}

const AutocompleteTeam: FC<Props> = ({ teamKey, disabled, onUpdate }) => {
  const onParticipantChange = (team: Team | null) => {
    onUpdate(team);
  };

  return (
    <>
      <ParticipantDropdown
        teamKey={teamKey}
        disabled={disabled}
        onChange={onParticipantChange}
      />
    </>
  );
};

export default AutocompleteTeam;
