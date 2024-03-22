import { Event, Tournament } from '@toa-lib/models';
import { FC } from 'react';
import UpgradedTable from './UpgradedTable/UpgradedTable';

interface Props {
  event: Event;
  tournaments: Tournament[];
  onEdit?: (tournament: Tournament) => void;
}

export const TournamentTable: FC<Props> = ({ event, tournaments, onEdit }) => {
  return (
    <UpgradedTable
      data={tournaments}
      headers={['Event', 'Tournament ID', 'Name', 'Tournament', 'Fields']}
      renderRow={(t) => {
        if (!event) return [];
        const { eventName } = event;
        const fields = `[${t.fields.toString().replaceAll(',', ', ')}]`;
        return [eventName, t.tournamentKey, t.name, t.tournamentLevel, fields];
      }}
      onModify={onEdit}
    />
  );
};
