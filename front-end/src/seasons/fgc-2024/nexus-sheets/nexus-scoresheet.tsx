import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import {
  Alliance,
  applySetpointToMotors,
  FieldControlUpdatePacket,
  MatchState,
  Motor
} from '@toa-lib/models';
import { Button, Checkbox, Grid, Stack, Typography } from '@mui/material';
import styled from '@emotion/styled';
import {
  AllianceNexusGoalState,
  defaultNexusGoalState,
  NexusGoalState
} from '@toa-lib/models/build/seasons/FeedingTheFuture';
import { useRecoilValue } from 'recoil';
import { matchStateAtom } from 'src/stores/recoil';
import { MotorA } from '@toa-lib/models/build/fcs/FeedingTheFutureFCS';
import { sendFCSPacket } from 'src/api/use-socket';

interface NexusScoresheetProps {
  state?: AllianceNexusGoalState;
  opposingState?: AllianceNexusGoalState;
  disabled?: boolean;
  alliance: Alliance;
  onChange?: (
    goal: keyof AllianceNexusGoalState,
    state: NexusGoalState
  ) => void;
  onOpposingChange?: (
    goal: keyof AllianceNexusGoalState,
    state: NexusGoalState
  ) => void;
  side: 'near' | 'far' | 'both';
  scorekeeperView?: boolean;
  allowForceRelease?: boolean;
}

const StairGoal = styled(Box)((props: { alliance: Alliance }) => ({
  border: `3px solid ${props.alliance === 'red' ? 'red' : 'blue'}`,
  marginTop: 'auto',
  flexGrow: 1,
  width: 1 / 6
}));

const CenterGoal = styled(Grid)((props: { alliance: Alliance }) => ({
  border: `3px solid ${props.alliance === 'red' ? 'red' : 'blue'}`
}));

const SideText = styled(Typography)(() => ({
  textOrientation: 'sideways',
  writingMode: 'vertical-lr'
}));

const NexusScoresheet: React.FC<NexusScoresheetProps> = ({
  state,
  opposingState,
  disabled,
  alliance,
  onChange,
  onOpposingChange,
  side,
  scorekeeperView,
  allowForceRelease
}) => {
  const cancelQueue = useRef<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      cancelQueue.current = cancelQueue.current.filter((c) => {
        if (c.time < Date.now()) {
          c.callback();
          return false;
        }
        return true;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      // cancel anything in the queue
      cancelQueue.current.forEach((c) => c.callback());
      cancelQueue.current = [];
    };
  });

  // If we're not passed in a state, we'll use the default state and disable the sheet
  if (!state) {
    state = { ...defaultNexusGoalState };
    disabled = true;
  }

  if (!opposingState) {
    opposingState = { ...defaultNexusGoalState };
  }

  const onGoalChange = (
    goal: keyof AllianceNexusGoalState,
    newState: NexusGoalState
  ) => {
    if (goal.startsWith('CW')) {
      if (!onOpposingChange) return;
      onOpposingChange(goal, newState);
    } else {
      // Center Field
      if (!onChange) return;
      onChange(goal, newState);
    }
  };

  const onForceRelease = (
    alliance: Alliance,
    goal: keyof AllianceNexusGoalState
  ) => {
    console.log(allowForceRelease);
    if (!allowForceRelease) return;
    // create packet to send to FCS
    const packetOn: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    const packetOff: FieldControlUpdatePacket = { hubs: {}, wleds: {} };

    // get motors for the goal
    let Motors: Motor[] = [];
    if (alliance === 'red') {
      // If the alliance is red and we're updaing the side goals, return the blue side goals. otherwise, return the red center goals
      // this is because the red ref is scoring for the blue side goals and the red center goals.
      Motors = goal.startsWith('CW')
        ? MotorA.BLUE_SIDE_GOALS
        : MotorA.RED_CENTER_GOALS;
    } else {
      // opposite of above
      Motors = goal.startsWith('CW')
        ? MotorA.RED_SIDE_GOALS
        : MotorA.BLUE_CENTER_GOALS;
    }

    // get number off end of motor
    const motorNumber = parseInt(goal.slice(2)) - 1; // -1 because soren indexed these stupid goals at 1
    const motor = Motors[motorNumber];

    // apply setpoint to motor
    applySetpointToMotors(1, [motor], packetOn);
    applySetpointToMotors(0, [motor], packetOff);

    // send on packet to FCS
    sendFCSPacket(packetOn);

    // add packetoff socket request to cancel queue
    cancelQueue.current.push({
      time: Date.now() + 3000,
      callback: () => sendFCSPacket(packetOff)
    });
  };

  return (
    <>
      {!scorekeeperView && (
        <>
          <Stack direction={alliance === 'red' ? 'row' : 'row-reverse'}>
            {/* Placeholder for better alignment */}
            <SideText variant='h6'>&nbsp;</SideText>
            <StepGoalGrid
              disabled={disabled}
              state={opposingState}
              onGoalChange={onGoalChange}
              alliance={alliance === 'red' ? 'blue' : 'red'} // intentionally inverted
              onForceRelease={(g) => onForceRelease(alliance, g)}
              allowForceRelease={!!allowForceRelease}
            />
            <Typography
              variant='h6'
              sx={{
                textOrientation: 'sideways',
                writingMode: 'vertical-lr',
                textAlign: alliance === 'red' ? 'right' : 'left',
                transform: alliance === 'blue' ? 'rotate(180deg)' : undefined
              }}
            >
              Center Field
            </Typography>
          </Stack>
          {/* Spacing between the two sets of goals */}
          <Box sx={{ height: '10px' }} />
        </>
      )}

      <Stack direction={alliance === 'blue' ? 'row' : 'row-reverse'}>
        <Typography
          variant='h6'
          sx={{
            textOrientation: 'sideways',
            writingMode: 'vertical-lr',
            textAlign: 'center',
            transform: alliance === 'blue' ? 'rotate(180deg)' : undefined,
            display: scorekeeperView ? 'none' : undefined
          }}
        >
          Center Field
        </Typography>
        <CenterGoalGrid
          disabled={disabled}
          state={state}
          onGoalChange={onGoalChange}
          alliance={alliance}
          side={side}
          fullWidth={scorekeeperView}
          onForceRelease={(g) => onForceRelease(alliance, g)}
          allowForceRelease={!!allowForceRelease}
        />
        {/* Placeholder for better alignment */}
        <SideText variant='h6'>&nbsp;</SideText>
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
  onForceRelease?: (goal: keyof AllianceNexusGoalState) => void;
  allowForceRelease: boolean;
}

interface CenterGoalGridProps extends GoalGridProps {
  side: 'near' | 'far' | 'both'; // perspective is from scorekeeper side of field
  fullWidth?: boolean;
}

const StepGoalGrid: React.FC<GoalGridProps> = ({
  disabled,
  state,
  onGoalChange,
  alliance,
  onForceRelease,
  allowForceRelease
}) => {
  const onForceReleaseLocal = (goal: keyof AllianceNexusGoalState) => {
    if (!onForceRelease) return;
    onForceRelease(goal);
  };

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
          onForceRelease={() => onForceReleaseLocal('CW1')}
          allowForceRelease={allowForceRelease}
        />
      </StairGoal>
      <StairGoal alliance={alliance} sx={{ height: '100%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW2}
          onChange={(s) => onGoalChange('CW2', s)}
          onForceRelease={() => onForceReleaseLocal('CW2')}
          allowForceRelease={allowForceRelease}
        />
      </StairGoal>

      {/* 80% goals */}
      <StairGoal alliance={alliance} sx={{ height: '80%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW3}
          onChange={(s) => onGoalChange('CW3', s)}
          onForceRelease={() => onForceReleaseLocal('CW3')}
          allowForceRelease={allowForceRelease}
        />
      </StairGoal>
      <StairGoal alliance={alliance} sx={{ height: '80%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW4}
          onChange={(s) => onGoalChange('CW4', s)}
          onForceRelease={() => onForceReleaseLocal('CW4')}
          allowForceRelease={allowForceRelease}
        />
      </StairGoal>

      {/* 60% goals */}
      <StairGoal alliance={alliance} sx={{ height: '60%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW5}
          onChange={(s) => onGoalChange('CW5', s)}
          onForceRelease={() => onForceReleaseLocal('CW5')}
          allowForceRelease={allowForceRelease}
        />
      </StairGoal>
      <StairGoal alliance={alliance} sx={{ height: '60%' }}>
        <GoalToggle
          disabled={disabled}
          state={state.CW6}
          onChange={(s) => onGoalChange('CW6', s)}
          onForceRelease={() => onForceReleaseLocal('CW6')}
          allowForceRelease={allowForceRelease}
        />
      </StairGoal>
    </Stack>
  );
};

const CenterGoalGrid: React.FC<CenterGoalGridProps> = ({
  disabled,
  state,
  onGoalChange,
  alliance,
  side,
  fullWidth,
  onForceRelease,
  allowForceRelease
}) => {
  /*
   * Center-field 3x2 goal.
   * Field is layed out as followed
   * R3 R2 R1 B1 B2 B3
   * R4 R5 R6 B6 B5 B4
   * Again, we'll utelize row-reverse here in the grid and lay out the grid with blue taking default
   */
  const directionBlue = side === 'far' ? 'row' : 'row-reverse';
  const directionRed = side === 'far' ? 'row-reverse' : 'row';

  const onForceReleaseLocal = (goal: keyof AllianceNexusGoalState) => {
    if (!onForceRelease) return;
    onForceRelease(goal);
  };

  return (
    <Grid
      container
      direction={alliance === 'blue' ? directionBlue : directionRed}
    >
      {/* First Row */}
      {(side === 'near' || side === 'both') && (
        <>
          <CenterGoal item xs={fullWidth ? 4 : 2} alliance={alliance}>
            <GoalToggle
              disabled={disabled}
              state={state.EC1}
              onChange={(s) => onGoalChange('EC1', s)}
              onForceRelease={() => onForceReleaseLocal('EC1')}
              allowForceRelease={allowForceRelease}
            />
          </CenterGoal>
          <CenterGoal item xs={fullWidth ? 4 : 2} alliance={alliance}>
            <GoalToggle
              disabled={disabled}
              state={state.EC2}
              onChange={(s) => onGoalChange('EC2', s)}
              onForceRelease={() => onForceReleaseLocal('EC2')}
              allowForceRelease={allowForceRelease}
            />
          </CenterGoal>
          <CenterGoal item xs={fullWidth ? 4 : 2} alliance={alliance}>
            <GoalToggle
              disabled={disabled}
              state={state.EC3}
              onChange={(s) => onGoalChange('EC3', s)}
              onForceRelease={() => onForceReleaseLocal('EC3')}
              allowForceRelease={allowForceRelease}
            />
          </CenterGoal>
        </>
      )}
      {/* Second Row (yes, it's backwards. gg FGC) */}
      {(side === 'far' || side === 'both') && (
        <>
          <CenterGoal item xs={2} alliance={alliance}>
            <GoalToggle
              disabled={disabled}
              state={state.EC6}
              onChange={(s) => onGoalChange('EC6', s)}
              onForceRelease={() => onForceReleaseLocal('EC6')}
              allowForceRelease={allowForceRelease}
            />
          </CenterGoal>
          <CenterGoal item xs={2} alliance={alliance}>
            <GoalToggle
              disabled={disabled}
              state={state.EC5}
              onChange={(s) => onGoalChange('EC5', s)}
              onForceRelease={() => onForceReleaseLocal('EC5')}
              allowForceRelease={allowForceRelease}
            />
          </CenterGoal>
          <CenterGoal item xs={2} alliance={alliance}>
            <GoalToggle
              disabled={disabled}
              state={state.EC4}
              onChange={(s) => onGoalChange('EC4', s)}
              onForceRelease={() => onForceReleaseLocal('EC4')}
              allowForceRelease={allowForceRelease}
            />
          </CenterGoal>
        </>
      )}
    </Grid>
  );
};

interface GoalToggleProps {
  disabled?: boolean;
  state: NexusGoalState;
  onChange?: (goal: NexusGoalState) => void;
  single?: boolean;
  onForceRelease?: () => void;
  allowForceRelease: boolean;
}

const BallCheckbox = styled(Checkbox)(
  (props: { ball: 'blue' | 'green'; single?: string }) => ({
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
  single,
  onForceRelease,
  allowForceRelease
}) => {
  const matchState = useRecoilValue(matchStateAtom);

  // If the food has been produced, we'll disable the toggle during and before the match is complete
  // after the match, we'll allow the toggles to be changed
  if (
    state === NexusGoalState.Produced &&
    matchState < MatchState.MATCH_COMPLETE
  ) {
    disabled = true;
  }

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

  const onForceReleaseLocal = () => {
    if (!onForceRelease) return;
    onForceRelease();
  };

  return (
    <>
      {NexusGoalState.Produced === state &&
        allowForceRelease &&
        matchState < MatchState.MATCH_COMPLETE && (
          <Box sx={{ position: 'relative', top: '45%', height: 0, px: 1 }}>
            <Button
              variant='contained'
              fullWidth
              sx={{
                backgroundColor: 'orange',
                ':hover': { backgroundColor: 'darkred' },
                zIndex: 40
              }}
              onClick={onForceReleaseLocal}
            >
              Force Release
            </Button>
          </Box>
        )}
      <Stack
        sx={{
          height: '100%',
          width: '100%',
          border:
            matchState === MatchState.MATCH_IN_PROGRESS &&
            state === NexusGoalState.Produced
              ? '5px dashed orange'
              : undefined
        }}
        direction={single ? 'row' : 'column'}
        flexGrow={1}
        justifyContent={'center'}
      >
        <BallCheckbox
          ball='blue'
          disabled={disabled}
          checked={
            state === NexusGoalState.BlueOnly ||
            state === NexusGoalState.Full ||
            state === NexusGoalState.Produced
          }
          onChange={toggleBlue}
          single={single?.toString()}
        />
        <BallCheckbox
          ball='green'
          disabled={disabled}
          checked={
            state === NexusGoalState.GreenOnly ||
            state === NexusGoalState.Full ||
            state === NexusGoalState.Produced
          }
          onChange={toggleGreen}
          single={single?.toString()}
        />
      </Stack>
    </>
  );
};

export default NexusScoresheet;
