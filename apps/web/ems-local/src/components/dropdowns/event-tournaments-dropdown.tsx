import { FC, useEffect } from 'react';
import { Tournament } from '@toa-lib/models';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';
import { Select } from 'antd';

interface Props {
  eventKey: string;
  value: string | null;
  fullWidth?: boolean;
  onChange: (tournament: Tournament | null) => void;
}

export const EventTournamentsDropdown: FC<Props> = ({
  eventKey,
  value,
  fullWidth,
  onChange
}) => {
  const { data: tournaments } = useTournamentsForEvent(eventKey);

  useEffect(() => {
    if (!value && tournaments && tournaments.length > 0) {
      onChange(tournaments[0]);
    }
  }, [tournaments]);

  const handleChange = (_: string, option: any) => {
    onChange(option ? option.tournament : null);
  };

  const items = tournaments?.map((t) => ({
    value: t.tournamentKey,
    label: t.name,
    key: t.tournamentKey,
    tournament: t
  })) || []

  return (
    <Select
      value={value ?? tournaments?.[0]?.tournamentKey ?? null}
      style={{ width: fullWidth ? '100%' : 'auto' }}
      onChange={handleChange}
      options={items}
    />
  );
};
