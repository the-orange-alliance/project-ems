import { FC } from 'react';
import { Team } from '@toa-lib/models';
import { Report } from './report-container.js';
import { UpgradedTable } from 'src/components/tables/upgraded-table.js';

interface Props {
  teams: Team[];
}

export const TeamsReport: FC<Props> = ({ teams }) => {
  const headers = [
    'Team Name (long)',
    'Team Name (short)',
    'Location',
    'Country Code',
    'Flag',
    'Rookie Year'
  ];

  const renderRow = (team: Team) => [
    team.teamNameLong,
    team.teamNameShort,
    [team.city, team.stateProv, team.country]
      .filter((str) => str.length > 0)
      .join(', '),
    team.countryCode,
    <span
      key={`flag-${team.teamKey}`}
      className={`flag-icon flag-border flag-icon-${team.countryCode.toLowerCase()}`}
    />,
    team.rookieYear
  ];

  return (
    <Report name='Competing Teams'>
      <UpgradedTable
        data={teams}
        headers={headers}
        rowKey='teamKey'
        renderRow={renderRow}
      />
    </Report>
  );
};
