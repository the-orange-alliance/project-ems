import { Team } from '@toa-lib/models';
import { FC } from 'react';
import UpgradedTable from './UpgradedTable/UpgradedTable';
import { Checkbox } from '@mui/material';

interface Props {
  teams: Team[];
  scheduledTeams?: Team[];
  disabled?: boolean;
  onChange?: (team: Team) => void;
}

export const ParticipantTable: FC<Props> = ({
  teams,
  scheduledTeams,
  disabled,
  onChange
}) => {
  return (
    <UpgradedTable
      data={teams}
      headers={[
        'Scheduled',
        'Team',
        'Short Name',
        'Long Name',
        'Location',
        'Country Code'
      ]}
      renderRow={(t) => {
        const location = [t.city, t.stateProv, t.country]
          .filter((str) => str.length > 0)
          .toString();
        const flag = (
          <div>
            <span
              className={`flag-icon flag-icon-${t.countryCode.toLowerCase()}`}
            />
            &nbsp;({t.countryCode})
          </div>
        );
        const handleChange = () => onChange?.(t);
        return [
          <Checkbox
            key={`team-${t.teamKey}`}
            checked={
              scheduledTeams?.find((b) => b.teamKey === t.teamKey) !== undefined
            }
            onChange={handleChange}
            disabled={disabled}
          />,
          t.teamKey,
          t.teamNameShort,
          t.teamNameLong,
          location,
          flag
        ];
      }}
    />
  );
};
