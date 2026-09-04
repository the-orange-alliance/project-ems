import { FC } from 'react';
import { Select } from 'antd';
import {
  PLAYOFF_STRUCTURES,
  TournamentType,
  getPlayoffStructuresForType,
  resolvePlayoffStructureKey
} from '@toa-lib/models';

interface Props {
  value: string | undefined;
  /** When set, only structures registered for this tournament type are listed. */
  tournamentType?: TournamentType;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const MatchSchedulerDropdown: FC<Props> = ({
  value,
  tournamentType,
  disabled,
  onChange
}) => {
  const forType = tournamentType
    ? getPlayoffStructuresForType(tournamentType)
    : [];
  // Never render an empty list (e.g. 'Eliminations' has no registered structure
  // yet) - fall back to the full registry.
  const structures = forType.length ? forType : PLAYOFF_STRUCTURES;
  const options = structures.map((s) => ({ value: s.key, label: s.name }));

  return (
    <Select
      value={resolvePlayoffStructureKey(value)}
      onChange={onChange}
      disabled={disabled}
      style={{ minWidth: 200 }}
      placeholder='Match Scheduler'
      options={options}
    />
  );
};
