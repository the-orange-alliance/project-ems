import { FC } from 'react';
import { Team } from '@toa-lib/models';
import ParticipantDropdown from 'src/components/dropdowns/ParticipantDropdown';

interface Props {
  teamKey: number | null;
  disabled?: boolean;
  white?: boolean;
  onUpdate: (t: Team | null) => void;
}

const AutocompleteTeam: FC<Props> = ({
  teamKey,
  disabled,
  white,
  onUpdate
}) => {
  const onParticipantChange = (team: Team | null) => {
    onUpdate(team);
  };

  return (
    <>
      <ParticipantDropdown
        teamKey={teamKey}
        disabled={disabled}
        onChange={onParticipantChange}
        white={white}
      />
    </>
  );
};

export default AutocompleteTeam;
