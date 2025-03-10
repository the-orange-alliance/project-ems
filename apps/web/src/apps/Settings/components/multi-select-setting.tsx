import { FC } from 'react';
import {
  FormGroup,
  FormControlLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Typography,
  SelectChangeEvent,
  Box,
  Chip
} from '@mui/material';

interface Props {
  name: string;
  value: string[];
  options: string[];
  onChange: (value: any) => void;
  inline?: boolean;
  title?: string;
  fullWidth?: boolean;
}

export const MultiSelectSetting: FC<Props> = ({
  name,
  value,
  options,
  onChange,
  inline,
  title,
  fullWidth
}) => {
  const handleChange = (e: SelectChangeEvent<typeof value>) =>
    onChange(
      typeof e.target.value === 'string'
        ? e.target.value.split(',')
        : e.target.value
    );

  return (
    <FormGroup
      sx={{
        '&:hover': {
          backgroundColor: (theme) => theme.palette.action.hover
        }
      }}
    >
      <FormControlLabel
        control={
          <Select
            multiple
            value={value}
            onChange={handleChange}
            input={<OutlinedInput label='Name' />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
            fullWidth={fullWidth}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        }
        label={
          <Typography sx={{ marginRight: 'auto', fontWeight: 'bold' }}>
            {name}
          </Typography>
        }
        labelPlacement={inline ? 'start' : 'top'}
        sx={{ padding: (theme) => theme.spacing(2) }}
        title={title}
      />
    </FormGroup>
  );
};
