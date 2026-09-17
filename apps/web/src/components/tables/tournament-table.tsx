import { Event, Tournament } from '@toa-lib/models';
import { FC } from 'react';
import { UpgradedTable } from './upgraded-table.js';
import { Skeleton } from 'antd';

interface Props {
  event: Event;
  tournaments: Tournament[];
  loading?: boolean;
  onEdit?: (tournament: Tournament) => void;
  onDelete?: (tournament: Tournament) => void;
}

export const TournamentTable: FC<Props> = ({
  event,
  tournaments,
  loading,
  onEdit,
  onDelete
}) => {
  return (
    <Skeleton loading={loading} active={loading}>
      <UpgradedTable
        rowKey='tournamentKey'
        data={tournaments}
        headers={[
          'Event',
          'Tournament ID',
          'Type',
          'Name',
          'Tournament',
          'Fields'
        ]}
        renderRow={(t) => {
          if (!event) return [];
          const { eventName } = event;
          const fields = `[${t.fields.toString().replaceAll(',', ', ')}]`;
          return [
            eventName,
            t.tournamentKey,
            t.name,
            t.tournamentType,
            t.tournamentLevel,
            fields
          ];
        }}
        onModify={onEdit}
        onDelete={onDelete}
      />
    </Skeleton>
  );
};
