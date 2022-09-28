import { FC, useState, MouseEvent } from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';

const StorageLevelInput: FC = () => {

  const [storageLevel, setStorageLevel] =  useState('storage0');
  const handleStorageLevel = (
    event: MouseEvent<HTMLElement>, newStorageLevel: string
  ) => {
    if (newStorageLevel !== null) {
      setStorageLevel(newStorageLevel);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px', alignItems: 'center' }}>
      <Typography variant='h6'>
        Storage Level
      </Typography>
      <ToggleButtonGroup fullWidth color='primary' value={storageLevel} onChange={handleStorageLevel} exclusive>
        <ToggleButton value='storage0'>0</ToggleButton>
        <ToggleButton value='storage1'>1</ToggleButton>
        <ToggleButton value='storage2'>2</ToggleButton>
        <ToggleButton value='storage3'>3</ToggleButton>
        <ToggleButton value='storage4'>4</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default StorageLevelInput;
