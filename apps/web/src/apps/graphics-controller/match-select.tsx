import { Select } from 'antd';
import { FC } from 'react';
import { useMatchesForEvent } from '../../api/use-match-data.js';

export interface MatchSelectProps {
  eventKey: string | null | undefined;
  value: number | undefined;
  onChange: (matchId: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MatchSelect: FC<MatchSelectProps> = ({
  eventKey,
  value,
  onChange,
  disabled,
  placeholder = 'All matches'
}) => {
  const { data: matches = [] } = useMatchesForEvent(eventKey ? eventKey : null);

  return (
    <Select
      allowClear
      style={{ width: '100%' }}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      showSearch
      optionFilterProp='label'
      options={matches.map((match) => ({
        value: match.id,
        label: `${match.name} (${match.tournamentKey})`
      }))}
      onChange={(value: number | undefined) => onChange(value)}
    />
  );
};
