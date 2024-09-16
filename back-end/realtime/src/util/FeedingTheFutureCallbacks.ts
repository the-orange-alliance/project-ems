import {
  applyPatternToStrips,
  applyStateToGoal,
  FeedingTheFuture,
  FieldControlUpdatePacket,
  FieldOptions,
  LedStrip,
  Match
} from '@toa-lib/models';
import { NexusGoalState } from '@toa-lib/models/build/seasons/FeedingTheFuture.js';
import { Socket } from 'socket.io';

const timers = new Map<string, NodeJS.Timeout>();

export const matchUpdateCallback = (
  previousDetails: FeedingTheFuture.MatchDetails,
  currentDetails: FeedingTheFuture.MatchDetails,
  broadcast: (update: FieldControlUpdatePacket) => void
) => {
  handleGoalStateChange(
    previousDetails.redNexusState.CW1,
    currentDetails.redNexusState.CW1,
    LedStrip.RED_SIDE_GOALS[0],
    'red.CW1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW2,
    currentDetails.redNexusState.CW2,
    LedStrip.RED_SIDE_GOALS[1],
    'red.CW2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW3,
    currentDetails.redNexusState.CW3,
    LedStrip.RED_SIDE_GOALS[2],
    'red.CW3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW4,
    currentDetails.redNexusState.CW4,
    LedStrip.RED_SIDE_GOALS[3],
    'red.CW4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW5,
    currentDetails.redNexusState.CW5,
    LedStrip.RED_SIDE_GOALS[4],
    'red.CW5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.CW6,
    currentDetails.redNexusState.CW6,
    LedStrip.RED_SIDE_GOALS[5],
    'red.CW6',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC1,
    currentDetails.redNexusState.EC1,
    LedStrip.RED_CENTER_GOALS[0],
    'red.EC1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC2,
    currentDetails.redNexusState.EC2,
    LedStrip.RED_CENTER_GOALS[1],
    'red.EC2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC3,
    currentDetails.redNexusState.EC3,
    LedStrip.RED_CENTER_GOALS[2],
    'red.EC3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC4,
    currentDetails.redNexusState.EC4,
    LedStrip.RED_CENTER_GOALS[3],
    'red.EC4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC5,
    currentDetails.redNexusState.EC5,
    LedStrip.RED_CENTER_GOALS[4],
    'red.EC5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.redNexusState.EC6,
    currentDetails.redNexusState.EC6,
    LedStrip.RED_CENTER_GOALS[5],
    'red.EC6',
    broadcast
  );

  handleGoalStateChange(
    previousDetails.blueNexusState.CW1,
    currentDetails.blueNexusState.CW1,
    LedStrip.BLUE_SIDE_GOALS[0],
    'blue.CW1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW2,
    currentDetails.blueNexusState.CW2,
    LedStrip.BLUE_SIDE_GOALS[1],
    'blue.CW2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW3,
    currentDetails.blueNexusState.CW3,
    LedStrip.BLUE_SIDE_GOALS[2],
    'blue.CW3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW4,
    currentDetails.blueNexusState.CW4,
    LedStrip.BLUE_SIDE_GOALS[3],
    'blue.CW4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW5,
    currentDetails.blueNexusState.CW5,
    LedStrip.BLUE_SIDE_GOALS[4],
    'blue.CW5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.CW6,
    currentDetails.blueNexusState.CW6,
    LedStrip.BLUE_SIDE_GOALS[5],
    'blue.CW6',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC1,
    currentDetails.blueNexusState.EC1,
    LedStrip.BLUE_CENTER_GOALS[0],
    'blue.EC1',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC2,
    currentDetails.blueNexusState.EC2,
    LedStrip.BLUE_CENTER_GOALS[1],
    'blue.EC2',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC3,
    currentDetails.blueNexusState.EC3,
    LedStrip.BLUE_CENTER_GOALS[2],
    'blue.EC3',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC4,
    currentDetails.blueNexusState.EC4,
    LedStrip.BLUE_CENTER_GOALS[3],
    'blue.EC4',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC5,
    currentDetails.blueNexusState.EC5,
    LedStrip.BLUE_CENTER_GOALS[4],
    'blue.EC5',
    broadcast
  );
  handleGoalStateChange(
    previousDetails.blueNexusState.EC6,
    currentDetails.blueNexusState.EC6,
    LedStrip.BLUE_CENTER_GOALS[5],
    'blue.EC6',
    broadcast
  );
};

const handleGoalStateChange = (
  previousState: NexusGoalState,
  currentState: NexusGoalState,
  strip: LedStrip,
  goal: string,
  broadcast: (update: FieldControlUpdatePacket) => void
) => {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };

  // Only set color on state change
  if (previousState !== currentState) {
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
        broadcast(result);

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
