import { Event, Team } from '@toa-lib/models';
import { FC } from 'react';
import { UpgradedTable } from './upgraded-table.js';
import { Skeleton } from 'antd';
interface Props {
  event: Event;
  teams: Team[];
  loading?: boolean;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
}

export const TeamsTable: FC<Props> = ({
  event,
  teams,
  loading,
  onEdit,
  onDelete
}) => {
  return (
    <Skeleton loading={loading} active={loading}>
      <UpgradedTable
        rowKey='teamKey'
        data={teams}
        headers={[
          'Event',
          'Team Number',
          'Short Name',
          'Long Name',
          'Location',
          'Country Code',
          'Rookie Year'
        ]}
        widths={[150, 100, 400, 400, 100, 100, 100, 100]}
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
            t.teamNumber,
            t.teamNameShort,
            t.teamNameLong,
            location,
            flag,
            t.rookieYear
          ];
        }}
        onModify={onEdit}
        onDelete={onDelete}
        virtual
      />
    </Skeleton>
  );
};
