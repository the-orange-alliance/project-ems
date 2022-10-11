import {
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
  SelectChangeEvent
} from '@mui/material';
import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { eventFields } from 'src/stores/Recoil';

interface Props {
  fields: number[];
  onChange: (fields: number[]) => void;
}

const FieldsDropdown: FC<Props> = ({ fields, onChange }) => {
  const allFields = useRecoilValue(eventFields);

  const changeFields = (event: SelectChangeEvent<number[]>) => {
    const {
      target: { value }
    } = event;
    onChange(typeof value === 'string' ? [] : value);
  };

  return (
    <Select
      labelId='demo-multiple-checkbox-label'
      id='demo-multiple-checkbox'
      multiple
      value={fields}
      onChange={changeFields}
      input={<OutlinedInput label='Tag' />}
      renderValue={(selected) => selected.join(', ')}
    >
      {allFields.map((field) => (
        <MenuItem key={field} value={field}>
          <Checkbox checked={fields.indexOf(field) > -1} />
          <ListItemText primary={`Field ${field}`} />
        </MenuItem>
      ))}
    </Select>
  );
};

export default FieldsDropdown;
