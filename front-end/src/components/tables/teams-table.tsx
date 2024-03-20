import { Event, Team } from '@toa-lib/models';
import { FC } from 'react';
import UpgradedTable from './UpgradedTable/UpgradedTable';

interface Props {
  event: Event;
  teams: Team[];
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
}

export const TeamsTable: FC<Props> = ({ event, teams, onEdit, onDelete }) => {
  return (
    <UpgradedTable
      data={teams}
      headers={[
        'Event',
        'Team',
        'Short Name',
        'Long Name',
        'Location',
        'Country Code',
        'Rookie Year'
      ]}
      renderRow={(t) => {
        const { eventName } = event;
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
        return [
          eventName,
          t.teamKey,
          t.teamNameShort,
          t.teamNameLong,
          location,
          flag,
          t.rookieYear
        ];
      }}
      onModify={onEdit}
      onDelete={onDelete}
    />
  );
};
