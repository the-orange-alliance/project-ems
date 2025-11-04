import { FC } from 'react';
import { Select } from 'antd';

interface Props {
  value: string | undefined;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const MatchSchedulerDropdown: FC<Props> = ({
  value,
  disabled,
  onChange
}) => {
  const options = [
    { value: 'fgc_2023', label: 'Round Robin' },
    { value: 'fgc_2023_2', label: 'Round Robin Finals' }
  ];

  return (
    <Select
      value={value ?? 'standard'}
      onChange={onChange}
      disabled={disabled}
      style={{ minWidth: 200 }}
      placeholder='Match Scheduler'
      options={options}
    />
  );
};
