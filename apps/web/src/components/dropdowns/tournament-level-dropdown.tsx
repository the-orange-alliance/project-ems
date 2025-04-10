import { FC } from 'react';
import { Select } from 'antd';
import {
  FINALS_LEVEL,
  OCTOFINALS_LEVEL,
  PRACTICE_LEVEL,
  QUALIFICATION_LEVEL,
  QUARTERFINALS_LEVEL,
  RANKING_LEVEL,
  ROUND_ROBIN_LEVEL,
  SEMIFINALS_LEVEL,
  TEST_LEVEL
} from '@toa-lib/models';

const { Option } = Select;

interface Props {
  value: number;
  fullWidth?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export const TournamentDropdown: FC<Props> = ({
  value,
  fullWidth,
  disabled,
  onChange
}) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{ width: fullWidth ? '100%' : 200 }}
      size='large'
      placeholder='Select tournament level'
    >
      <Option value={TEST_LEVEL}>Test</Option>
      <Option value={PRACTICE_LEVEL}>Practice</Option>
      <Option value={QUALIFICATION_LEVEL}>Qualification</Option>
      <Option value={ROUND_ROBIN_LEVEL}>Round Robin</Option>
      <Option value={RANKING_LEVEL}>Ranking</Option>
      <Option value={OCTOFINALS_LEVEL}>Octofinals</Option>
      <Option value={QUARTERFINALS_LEVEL}>Quarterfinals</Option>
      <Option value={SEMIFINALS_LEVEL}>Semifinals</Option>
      <Option value={FINALS_LEVEL}>Finals</Option>
    </Select>
  );
};
