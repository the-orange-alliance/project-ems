import { FC } from 'react';
import { Select } from 'antd';
import { Tournament } from '@toa-lib/models';

const { Option } = Select;

interface Props {
  tournaments: Tournament[] | null | undefined;
  value: string | null | undefined;
  fullWidth?: boolean;
  onChange: (tournamentKey: string) => void;
}

const TournamentDropdown: FC<Props> = ({
  tournaments,
  value,
  fullWidth,
  onChange
}) => {
  const handleChange = (selectedValue: string) => {
    onChange(selectedValue);
  };

  // This resolves "uncontrolled" input becoming "controlled" error
  const resolvedValue = value ?? '__select__tournament__';

  return (
    <Select
      style={{ width: fullWidth ? '100%' : 120, margin: 8 }}
      value={resolvedValue}
      onChange={handleChange}
      disabled={!tournaments || tournaments.length === 0}
      placeholder='Select A Tournament'
    >
      <Option value='__select__tournament__' disabled>
        Select A Tournament
      </Option>
      {tournaments?.map((t) => (
        <Option
          key={`${t.tournamentKey}-${t.tournamentKey}`}
          value={t.tournamentKey}
        >
          {t.name}
        </Option>
      ))}
    </Select>
  );
};

export default TournamentDropdown;
