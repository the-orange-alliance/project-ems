import { Select } from 'antd';
import { FC } from 'react';
import { useCurrentTournament } from 'src/api/use-tournament-data';

interface Props {
  fields: number[];
  onChange: (fields: number[]) => void;
}

export const EventTournamentFieldsDropdown: FC<Props> = ({
  fields,
  onChange
}) => {
  const tournament = useCurrentTournament();
  const allFields = (tournament?.fields ?? []).map((f, i) => ({
    name: f,
    field: i + 1
  }));

  return (
    <Select
      mode='multiple'
      value={fields}
      onChange={onChange}
      style={{ width: '100%' }}
      options={allFields.map((field) => ({
        label: field.name,
        value: field.field
      }))}
    />
  );
};
