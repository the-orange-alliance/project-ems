import { FC } from 'react';
import { Select } from 'antd';
import { Team } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { teamIdentifierAtom } from 'src/stores/state/ui.js';

interface Props {
  teamKey: number | null;
  disabled?: boolean;
  white?: boolean;
  teams?: Team[];
  onChange: (team: Team | null) => void;
}

export const AutocompleteTeam: FC<Props> = ({
  teamKey,
  disabled,
  white,
  teams,
  onChange
}) => {
  const identifier = useAtomValue(teamIdentifierAtom);
  const team = teams?.find((t) => t.teamKey === teamKey);

  return (
    <Select
      showSearch
      allowClear
      value={teamKey ?? undefined}
      disabled={disabled}
      style={{ width: '100%', background: white ? '#fff' : undefined }}
      placeholder="Select a team"
      optionFilterProp="children"
      onChange={(value) => {
        const selected = teams?.find((t) => t.teamKey === value) || null;
        onChange(selected);
      }}
      filterOption={(input, option) => {
        if (!option) return false;
        const label = typeof option.children === 'string' ? option.children : '';
        return label.toLowerCase().includes(input.toLowerCase());
      }}
    >
      {(teams ?? []).map((option) => (
        <Select.Option key={option.teamKey} value={option.teamKey}>
          <span className={'flag-icon flag-icon-' + option.countryCode.toLowerCase()}></span>
          &nbsp;
          <span>{option[identifier as keyof typeof option]}</span>
        </Select.Option>
      ))}
    </Select>
  );
};
