import { FC, MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';

interface Props {
  title: string;
  states: string[];
  value: number;
  fullWidth?: boolean;
  onChange: (value: number) => void;
}

const StateToggle: FC<Props> = ({
  title,
  states,
  value,
  fullWidth,
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

export default StateToggle;
