import {
  applyPatternToStrips,
  applySetpointToMotors,
  FeedingTheFuture,
  FieldControlUpdatePacket
} from '@toa-lib/models';
import {
  LedStripA,
  MotorA
} from '@toa-lib/models/build/fcs/FeedingTheFutureFCS.js';
import { NexusGoalState } from '@toa-lib/models/build/seasons/FeedingTheFuture.js';

const timers = new Map<string, NodeJS.Timeout>();

export const matchUpdateCallback = (
  previousDetails: FeedingTheFuture.MatchDetails,
  currentDetails: FeedingTheFuture.MatchDetails,
  broadcast: (update: FieldControlUpdatePacket) => void
) => {
  handleGoalStateChange(
    previousDetails.redNexusState.CW1,
    currentDetails.redNexusState.CW1,
    LedStripA.RED_SIDE_GOALS[0],
    MotorA.RED_SIDE_GOALS[0],
    'red.CW1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW2,
    currentDetails.redNexusState.CW2,
    LedStripA.RED_SIDE_GOALS[1],
    MotorA.RED_SIDE_GOALS[1],
    'red.CW2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW3,
    currentDetails.redNexusState.CW3,
    LedStripA.RED_SIDE_GOALS[2],
    MotorA.RED_SIDE_GOALS[2],
    'red.CW3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW4,
    currentDetails.redNexusState.CW4,
    LedStripA.RED_SIDE_GOALS[3],
    MotorA.RED_SIDE_GOALS[3],
    'red.CW4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW5,
    currentDetails.redNexusState.CW5,
    LedStripA.RED_SIDE_GOALS[4],
    MotorA.RED_SIDE_GOALS[4],
    'red.CW5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW6,
    currentDetails.redNexusState.CW6,
    LedStripA.RED_SIDE_GOALS[5],
    MotorA.RED_SIDE_GOALS[5],
    'red.CW6',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC1,
    currentDetails.redNexusState.EC1,
    LedStripA.RED_CENTER_GOALS[0],
    MotorA.RED_CENTER_GOALS[0],
    'red.EC1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC2,
    currentDetails.redNexusState.EC2,
    LedStripA.RED_CENTER_GOALS[1],
    MotorA.RED_CENTER_GOALS[1],
    'red.EC2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC3,
    currentDetails.redNexusState.EC3,
    LedStripA.RED_CENTER_GOALS[2],
    MotorA.RED_CENTER_GOALS[2],
    'red.EC3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC4,
    currentDetails.redNexusState.EC4,
    LedStripA.RED_CENTER_GOALS[3],
    MotorA.RED_CENTER_GOALS[3],
    'red.EC4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC5,
    currentDetails.redNexusState.EC5,
    LedStripA.RED_CENTER_GOALS[4],
    MotorA.RED_CENTER_GOALS[4],
    'red.EC5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC6,
    currentDetails.redNexusState.EC6,
    LedStripA.RED_CENTER_GOALS[5],
    MotorA.RED_CENTER_GOALS[5],
    'red.EC6',
    broadcast
  );

  handleGoalStateChange(
    previousDetails.blueNexusState.CW1,
    currentDetails.blueNexusState.CW1,
    LedStripA.BLUE_SIDE_GOALS[0],
    MotorA.BLUE_SIDE_GOALS[0],
    'blue.CW1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW2,
    currentDetails.blueNexusState.CW2,
    LedStripA.BLUE_SIDE_GOALS[1],
    MotorA.BLUE_SIDE_GOALS[1],
    'blue.CW2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW3,
    currentDetails.blueNexusState.CW3,
    LedStripA.BLUE_SIDE_GOALS[2],
    MotorA.BLUE_SIDE_GOALS[2],
    'blue.CW3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW4,
    currentDetails.blueNexusState.CW4,
    LedStripA.BLUE_SIDE_GOALS[3],
    MotorA.BLUE_SIDE_GOALS[3],
    'blue.CW4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW5,
    currentDetails.blueNexusState.CW5,
    LedStripA.BLUE_SIDE_GOALS[4],
    MotorA.BLUE_SIDE_GOALS[4],
    'blue.CW5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW6,
    currentDetails.blueNexusState.CW6,
    LedStripA.BLUE_SIDE_GOALS[5],
    MotorA.BLUE_SIDE_GOALS[5],
    'blue.CW6',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC1,
    currentDetails.blueNexusState.EC1,
    LedStripA.BLUE_CENTER_GOALS[0],
    MotorA.BLUE_CENTER_GOALS[0],
    'blue.EC1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC2,
    currentDetails.blueNexusState.EC2,
    LedStripA.BLUE_CENTER_GOALS[1],
    MotorA.BLUE_CENTER_GOALS[1],
    'blue.EC2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC3,
    currentDetails.blueNexusState.EC3,
    LedStripA.BLUE_CENTER_GOALS[2],
    MotorA.BLUE_CENTER_GOALS[2],
    'blue.EC3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC4,
    currentDetails.blueNexusState.EC4,
    LedStripA.BLUE_CENTER_GOALS[3],
    MotorA.BLUE_CENTER_GOALS[3],
    'blue.EC4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC5,
    currentDetails.blueNexusState.EC5,
    LedStripA.BLUE_CENTER_GOALS[4],
    MotorA.BLUE_CENTER_GOALS[4],
    'blue.EC5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC6,
    currentDetails.blueNexusState.EC6,
    LedStripA.BLUE_CENTER_GOALS[5],
    MotorA.BLUE_CENTER_GOALS[5],
    'blue.EC6',
    broadcast
  );

  handleRampStateChange(
    previousDetails.fieldBalanced,
    currentDetails.fieldBalanced,
    broadcast
  );
};

const handleGoalStateChange = (
  previousState: NexusGoalState,
  currentState: NexusGoalState,
  strip: LedStripA,
  motor: MotorA,
  goal: string,
  broadcast: (update: FieldControlUpdatePacket) => void
) => {
  if (previousState === currentState) return;

  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };

  switch (currentState) {
    case NexusGoalState.Full:
      applyPatternToStrips('ffa500', [strip], result);
      break;
    case NexusGoalState.BlueOnly:
      applyPatternToStrips('0000ff', [strip], result);
      break;
    case NexusGoalState.GreenOnly:
      applyPatternToStrips('00ff00', [strip], result);
      break;
    default:
      applyPatternToStrips('000000', [strip], result);
  }

  if (
    currentState === NexusGoalState.Full &&
    previousState !== NexusGoalState.Full
  ) {
    // Start timer with callback
    timers.set(
      goal,
      setTimeout(() => {
        // Set pattern
        const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
        applyPatternToStrips('ffffff', [strip], result);
        applySetpointToMotors(1.0, [motor], result);
        broadcast(result);

        setTimeout(() => {
          const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
          applySetpointToMotors(0, [motor], result);
          broadcast(result);
        }, 5000); // TODO(jan): Use field options

        // TODO(jan): Update match to mark food as dispensed
      }, 5000) // TODO(jan): Make this time configurable
    );
  } else if (
    currentState !== NexusGoalState.Full &&
    previousState === NexusGoalState.Full
  ) {
    // Cancel timer if there is one
    clearTimeout(timers.get(goal));
  }

  // Broadcast update
  broadcast(result);
};

const handleRampStateChange = (
  previousBalanced: number,
  currentBalanced: number,
  broadcast: (update: FieldControlUpdatePacket) => void
) => {
  if (currentBalanced === previousBalanced) return;

  clearTimeout(timers.get('ramp'));

  timers.set(
    'ramp',
    setTimeout(() => {
      const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
      applyPatternToStrips(
        currentBalanced ? '000000' : 'ff00ff',
        [LedStripA.RAMP],
        result
      );
      broadcast(result);
    }, 500) // TODO(jan): Make this configurable
  );
};
