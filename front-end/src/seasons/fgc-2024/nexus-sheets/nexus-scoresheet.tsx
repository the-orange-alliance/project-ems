import React from 'react';
import Box from '@mui/material/Box';
import { Alliance, FeedingTheFuture } from '@toa-lib/models';
import { Checkbox, Grid, Stack, Typography } from '@mui/material';
import styled from '@emotion/styled';
import {
  AllianceNexusGoalState,
  defaultNexusGoalState,
  NexusGoalState
} from '@toa-lib/models/build/seasons/FeedingTheFuture';

interface NexusScoresheetProps {
  state?: AllianceNexusGoalState;
  disabled?: boolean;
  alliance: Alliance;
  onChange?: (state: AllianceNexusGoalState) => void;
}

const StairGoal = styled(Box)((props: { alliance: Alliance }) => ({
  border: `1px solid ${props.alliance === 'red' ? 'red' : 'blue'}`,
  marginTop: 'auto',
  flexGrow: 1,
  width: 1 / 6
}));

const CenterGoal = styled(Grid)((props: { alliance: Alliance }) => ({
  border: `1px solid ${props.alliance === 'red' ? 'red' : 'blue'}`
}));

const SideText = styled(Typography)((props: { alliance: Alliance }) => ({
  textOrientation: 'sideways',
  writingMode: 'vertical-lr'
}));

const NexusScoresheet: React.FC<NexusScoresheetProps> = ({
  state,
  disabled,
  alliance,
  onChange
}) => {
  // If we're not passed in a state, we'll use the default state and disable the sheet
  if (!state) {
    state = { ...defaultNexusGoalState };
    disabled = true;
  }

  const onGoalChange = (
    goal: keyof AllianceNexusGoalState,
    newState: NexusGoalState
  ) => {
    if (!onChange) return;
    onChange({ ...state, [goal]: newState });
  };

  return (
    <>
      <Stack direction={alliance === 'blue' ? 'row' : 'row-reverse'}>
        {/* Placeholder for better alignment */}
        <SideText alliance='blue' variant='h6'>
          &nbsp;
        </SideText>
        <StepGoalGrid
          disabled={disabled}
          state={state}
          onGoalChange={onGoalChange}
          alliance={alliance}
        />
        <Typography
          variant='h6'
          sx={{
            textOrientation: 'sideways',
            writingMode: 'vertical-lr',
            textAlign: alliance === 'blue' ? 'right' : 'left',
            transform: alliance === 'red' ? 'rotate(180deg)' : undefined
          }}
        >
          Center Field
        </Typography>
      </Stack>

      {/* Spacing between the two sets of goals */}
      <Box sx={{ height: '10px' }} />

      <Stack direction={alliance === 'blue' ? 'row' : 'row-reverse'}>
        <Typography
          variant='h6'
          sx={{
            textOrientation: 'sideways',
            writingMode: 'vertical-lr',
            textAlign: 'center',
            transform: alliance === 'blue' ? 'rotate(180deg)' : undefined
          }}
        >
          Center Field
        </Typography>
        <CenterGoalGrid
          disabled={disabled}
          state={state}
          onGoalChange={onGoalChange}
          alliance={alliance}
        />
        {/* Placeholder for better alignment */}
        <SideText alliance='blue' variant='h6'>
          &nbsp;
        </SideText>
      </Stack>
    </>
  );
};

interface GoalGridProps {
  disabled?: boolean;
  state: AllianceNexusGoalState;
  onGoalChange: (
    goal: keyof AllianceNexusGoalState,
    state: NexusGoalState
  ) => void;
  alliance: Alliance;
}

const StepGoalGrid: React.FC<GoalGridProps> = ({
  disabled,
  state,
  onGoalChange,
  alliance
}) => {
  /*
   * Stair-step goals
   * Blue steps down, red steps up.  We'll reverse the row to handle that.  CSS hax
   */
  return (
    <Stack
      direction={alliance === 'blue' ? 'row' : 'row-reverse'}
      sx={{ height: '20vh', width: '100%' }}
    >
      {/* Tall Goals First */}
      <StairGoal alliance={alliance} sx={{ height: '100%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW1}
          onChange={(s) => onGoalChange('CW1', s)}
        />
      </StairGoal>
      <StairGoal alliance={alliance} sx={{ height: '100%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW2}
          onChange={(s) => onGoalChange('CW2', s)}
        />
      </StairGoal>

      {/* 80% goals */}
      <StairGoal alliance={alliance} sx={{ height: '80%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW3}
          onChange={(s) => onGoalChange('CW3', s)}
        />
      </StairGoal>
      <StairGoal alliance={alliance} sx={{ height: '80%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW4}
          onChange={(s) => onGoalChange('CW4', s)}
        />
      </StairGoal>

      {/* 60% goals */}
      <StairGoal alliance={alliance} sx={{ height: '60%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW5}
          onChange={(s) => onGoalChange('CW5', s)}
        />
      </StairGoal>
      <StairGoal alliance={alliance} sx={{ height: '60%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW6}
          onChange={(s) => onGoalChange('CW6', s)}
        />
      </StairGoal>
    </Stack>
  );
};

const CenterGoalGrid: React.FC<GoalGridProps> = ({
  disabled,
  state,
  onGoalChange,
  alliance
}) => {
  /*
   * Center-field 3x2 goal.
   * Field is layed out as followed
   * R3 R2 R1 B1 B2 B3
   * R4 R5 R6 B6 B5 B4
   * Again, we'll utelize row-reverse here in the grid and lay out the grid with blue taking default
   */
  return (
    <Grid container direction={alliance === 'blue' ? 'row' : 'row-reverse'}>
      {/* First Row */}
      <CenterGoal item xs={4} alliance={alliance}>
        <GoalToggle
          disabled={disabled}
          state={state.EC1}
          onChange={(s) => onGoalChange('EC1', s)}
          single
        />
      </CenterGoal>
      <CenterGoal item xs={4} alliance={alliance}>
        <GoalToggle
          disabled={disabled}
          state={state.EC2}
          onChange={(s) => onGoalChange('EC2', s)}
          single
        />
      </CenterGoal>
      <CenterGoal item xs={4} alliance={alliance}>
        <GoalToggle
          disabled={disabled}
          state={state.EC3}
          onChange={(s) => onGoalChange('EC3', s)}
          single
        />
      </CenterGoal>
      {/* Second Row (yes, it's backwards. gg FGC) */}
      <CenterGoal item xs={4} alliance={alliance}>
        <GoalToggle
          disabled={disabled}
          state={state.EC6}
          onChange={(s) => onGoalChange('EC6', s)}
          single
        />
      </CenterGoal>
      <CenterGoal item xs={4} alliance={alliance}>
        <GoalToggle
          disabled={disabled}
          state={state.EC5}
          onChange={(s) => onGoalChange('EC5', s)}
          single
        />
      </CenterGoal>
      <CenterGoal item xs={4} alliance={alliance}>
        <GoalToggle
          disabled={disabled}
          state={state.EC4}
          onChange={(s) => onGoalChange('EC4', s)}
          single
        />
      </CenterGoal>
    </Grid>
  );
};

interface GoalToggleProps {
  disabled?: boolean;
  state: NexusGoalState;
  onChange?: (goal: NexusGoalState) => void;
  single?: boolean;
}

const BallCheckbox = styled(Checkbox)(
  (props: { ball: 'blue' | 'green'; single?: boolean }) => ({
    color: props.ball === 'blue' ? '#6ab7c1' : '#81cb46',
    '&.Mui-checked': {
      color: props.ball === 'blue' ? '#6ab7c1' : '#81cb46'
    },
    '&.Mui-disabled': {
      color: props.ball === 'blue' ? '#6ab7c15b' : '#82cb465b'
    },
    borderRadius: 0,
    height: props.single ? '100%' : '50%',
    '> svg': {
      width: '90%',
      height: '90%'
    }
  })
);

const GoalToggle: React.FC<GoalToggleProps> = ({
  disabled,
  state,
  onChange,
  single
}) => {
  const toggleBlue = () => {
    if (!onChange) return;

    switch (state) {
      case NexusGoalState.BlueOnly: // Blue only, toggle to empty
        onChange(NexusGoalState.Empty);
        break;
      case NexusGoalState.GreenOnly: // Green only, toggle to full
        onChange(NexusGoalState.Full);
        break;
      case NexusGoalState.Full: // Full, toggle to green only
        onChange(NexusGoalState.GreenOnly);
        break;
      default: // Empty, toggle to blue only
        onChange(NexusGoalState.BlueOnly);
    }
  };

  const toggleGreen = () => {
    if (!onChange) return;

    switch (state) {
      case NexusGoalState.BlueOnly: // Blue only, toggle to full
        onChange(NexusGoalState.Full);
        break;
      case NexusGoalState.GreenOnly: // Green only, toggle to empty
        onChange(NexusGoalState.Empty);
        break;
      case NexusGoalState.Full: // Full, toggle to blue only
        onChange(NexusGoalState.BlueOnly);
        break;
      default: // Empty, toggle to green only
        onChange(NexusGoalState.GreenOnly);
    }
  };

  return (
    <Stack
      sx={{ height: '100%', width: '100%' }}
      direction={single ? 'row' : 'column'}
      flexGrow={1}
      justifyContent={'center'}
    >
      <BallCheckbox
        ball='blue'
        disabled={disabled}
        checked={
          state === NexusGoalState.BlueOnly || state === NexusGoalState.Full
        }
        onChange={toggleBlue}
        single={single}
      />
      <BallCheckbox
        ball='green'
        disabled={disabled}
        checked={
          state === NexusGoalState.GreenOnly || state === NexusGoalState.Full
        }
        onChange={toggleGreen}
        single={single}
      />
    </Stack>
  );
};

export default NexusScoresheet;
