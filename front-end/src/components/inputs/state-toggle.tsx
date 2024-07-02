import { FC, MouseEvent, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';

interface Props {
  title: ReactNode | string;
  states: string[];
  value: number;
  fullWidth?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export const StateToggle: FC<Props> = ({
  title,
  states,
  value,
  fullWidth,
  disabled,
  onChange
}) => {
  const handleChange = (event: MouseEvent, newValue: number) => {
    if (newValue != null) {
      onChange(newValue);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%'
      }}
    >
      <Typography variant='h6' align='center'>
        {title}
      </Typography>
      <ToggleButtonGroup
        value={value}
        onChange={handleChange}
        fullWidth={fullWidth}
        disabled={disabled}
        exclusive
      >
        {states.map((s, i) => (
          <ToggleButton key={`${title}-${i}`} value={i} fullWidth={fullWidth}>
            {s}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};
