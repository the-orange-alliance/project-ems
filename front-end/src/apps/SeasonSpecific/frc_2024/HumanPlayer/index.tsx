/* eslint-disable prettier/prettier */
import { Button, Grid, Typography } from '@mui/material';
import {
  BonusPeriodConfig,
  Crescendo,
  MatchSocketEvent,
  MatchState
} from '@toa-lib/models';
import { FC, useEffect, useRef, useState } from 'react';
import {
  atom,
  useRecoilCallback,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState
} from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import ConnectionChip from 'src/components/ConnectionChip/ConnectionChip';
import MatchChip from 'src/components/MatchChip/MatchChip';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import MatchCountdown from 'src/components/MatchCountdown/MatchCountdown';
import {
  matchInProgressAtom,
  matchStateAtom,
  matchStatusAtom,
  timer
} from 'src/stores/NewRecoil';

// Amplify token offset
const AmplifyTokenOffsetAtom = atom<number>({
  key: 'AmplifyTokenOffset',
  default: 0
});

// Whether or not the amplify bonus is active
const AmplifyActiveAtom = atom<boolean>({
  key: 'AmplifyActive',
  default: false
});

// Calculate total amp tokens based on alliance
const calcTotalAmpTokens = (
  details: Crescendo.MatchDetails,
  alliance: 'red' | 'blue'
) => {
  let allAmpTokens = 0;
  if (alliance === 'red') {
    // Add all auto and teleop amp notes.  If co-op is activated, subtract 1 (co-op costs 1 amp token)
    allAmpTokens +=
      details.redAutoAmpNotes +
      details.redTeleAmpNotes -
      (details.redActivatedCoop ? 1 : 0);
  } else {
    allAmpTokens +=
      details.blueAutoAmpNotes +
      details.blueTeleAmpNotes -
      (details.blueActivatedCoop ? 1 : 0);
  }
  return allAmpTokens;
};

const HumanPlayer: FC = () => {
  // Match State Trackers
  const matchMode = useRecoilValue(matchStatusAtom); // "TELEOPERATED" or "ENDGAME"
  const matchState = useRecoilValue(matchStateAtom);

  // Button/Action state trackers
  const [canAmp, setCanAmp] = useState(false);
  const [canCoop, setCanCoop] = useState(false);

  // Track alliance selection
  const [alliance, setAlliance] = useState<null | 'red' | 'blue'>(null);
  const allianceRef = useRef<'red' | 'blue' | null>(alliance);

  // Socket
  const socketRef = useRef<any>(null);
  const [socket, connected] = useSocket();

  // Match state
  const match = useRecoilValue(matchInProgressAtom);

  // Amplify states
  const amplifyTokenOffset = useRecoilValue(AmplifyTokenOffsetAtom);
  const setAmplifyTokenOffset = useSetRecoilState(AmplifyTokenOffsetAtom);
  const [amplifyActive, setAmplifyActive] = useRecoilState(AmplifyActiveAtom);

  // Unofficial amplify timer and offset for showing real-time amp time remaining and amp'd notes scored
  const [ampTimeRemaining, setAmpTimeRemaining] = useState<number>(0);
  const ampTimeStart = useRef<number>(0);
  const [ampedSpeakerNotesOffset, setAmpedSpeakerNotesOffset] = useState(0);

  // Register socket listeners for bonus start and end
  useEffect(() => {
    socketRef.current = socket;
    if (connected) {
      socket?.on(MatchSocketEvent.BONUS_END, onBonusEnd);
      socket?.on(MatchSocketEvent.BONUS_START, onBonusStart);
    }
  }, [connected]);

  // Register interval to check if we can co-op
  useEffect(() => {
    const tick = setInterval(() => {
      // Can't co-op after first 45 seconds in match
      if (timer.timeLeft <= 90) {
        setCanCoop(false);
      }

      // Update amp timer if time is greater than 0
      if (ampTimeStart.current - timer.timeLeft > 0) {
        setAmpTimeRemaining(10 - (ampTimeStart.current - timer.timeLeft));
      }
    }, 500);

    return () => {
      // Clear interval and remove socket listeners when page is unmounted
      clearInterval(tick);
      socket?.off(MatchSocketEvent.BONUS_END, onBonusEnd);
      socket?.off(MatchSocketEvent.BONUS_START, onBonusStart);
    };
  }, []);

  // We subscribe to match details updates and calculate if we can co-op/amplify when the score updates
  useEffect(() => {
    if (!match || !match.details) return;
    // CO-OP
    // Co-opping costs 1 "amp point" and can only be activated in the first 45 seconds of the teleop period of the match
    // The below code determines if we're within the co-oping range and sets the canCoop state accordingly

    // Determine if we're within co-oping range
    // Must be in progress and in teleop
    const matchStateCorrect = matchState === MatchState.MATCH_IN_PROGRESS;
    const matchModeCorrect = matchMode === 'TELEOPERATED';
    // Must have at least 1 amp point
    const has1AmpPointRed =
      match.details.redTeleAmpNotes + match.details.redAutoAmpNotes > 0;
    const has1AmpPointBlue =
      match.details.blueTeleAmpNotes + match.details?.blueAutoAmpNotes > 0;
    const allianceHasAmpPoint =
      alliance === 'red' ? has1AmpPointRed : has1AmpPointBlue;
    // Co-op can only be activated in first 45 seconds of match
    const matchTimeCorrect = timer.timeLeft > 90;
    if (
      matchStateCorrect &&
      matchModeCorrect &&
      allianceHasAmpPoint &&
      matchTimeCorrect
    ) {
      setCanCoop(true);
    } else {
      setCanCoop(false);
    }

    // Determine if we're within amplifying range
    const allAmpTokens = calcTotalAmpTokens(
      match.details,
      allianceRef.current ?? 'red'
    );
    if (allAmpTokens - amplifyTokenOffset > 1 && !amplifyActive) {
      setCanAmp(true);
    } else {
      setCanAmp(false);
    }
  }, [match, matchState, matchMode]);

  // Callback to reset amplify token offset when match finishes prestarting
  useEffect(() => {
    if (matchState !== MatchState.MATCH_IN_PROGRESS) {
      setAmplifyTokenOffset(0);
      setCanAmp(false);
      setCanCoop(false);
    }
  }, [matchState]);

  // Co-op button callback
  const onCoop = useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const currMatch = await snapshot.getPromise(matchInProgressAtom);
        if (!currMatch) return;
        let details;
        if (allianceRef.current === 'red') {
          details = Object.assign(
            {},
            { ...currMatch.details, redActivatedCoop: true }
          );
        } else {
          details = Object.assign(
            {},
            { ...currMatch.details, blueActivatedCoop: true }
          );
        }

        // If both alliances have pressed the button, activate the co-op bonus
        if (details.redActivatedCoop && details.blueActivatedCoop) {
          details = Object.assign({}, { ...details, coopertitionBonus: 1 });
        }

        const newMatch = Object.assign({}, { ...currMatch, details });
        socketRef.current?.emit(MatchSocketEvent.UPDATE, newMatch);
        set(matchInProgressAtom, newMatch);
      },
    []
  );

  // Amplify button callback
  const onAmp = useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        // Fetch current state
        const currMatch = await snapshot.getPromise(matchInProgressAtom);
        const currOffset = await snapshot.getPromise(AmplifyTokenOffsetAtom);
        const currAmpActive = await snapshot.getPromise(AmplifyActiveAtom);

        // Return if we can't amplify
        if (
          !currMatch ||
          !currMatch.details ||
          typeof currOffset !== 'number' ||
          currAmpActive
        )
          return;

        // Update token offset
        const totalAmpTokens = calcTotalAmpTokens(
          currMatch?.details ?? {},
          allianceRef.current ?? 'red'
        );
        set(AmplifyTokenOffsetAtom, totalAmpTokens);

        socketRef.current?.emit(
          MatchSocketEvent.BONUS_START,
          allianceRef.current === 'red'
            ? 'FRC_2024_AMPLIFY_RED'
            : 'FRC_2024_AMPLIFY_BLUE'
        );
        // Update ref to current timer time
        ampTimeStart.current = timer.timeLeft;
        setAmpedSpeakerNotesOffset(
          allianceRef.current === 'red'
            ? currMatch.details.redTeleSpeakerNotesAmped
            : currMatch.details.blueTeleSpeakerNotesAmped
        );

        setCanAmp(false);
      },
    []
  );

  // Amplify end callback
  const onBonusEnd = useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        // Fetch current state
        const currMatch = await snapshot.getPromise(matchInProgressAtom);

        // Return if we can't amplify
        if (!currMatch || !currMatch.details) return;

        // Update token offset
        const totalAmpTokens = calcTotalAmpTokens(
          currMatch?.details ?? {},
          allianceRef.current ?? 'red'
        );
        set(AmplifyTokenOffsetAtom, totalAmpTokens);
        set(AmplifyActiveAtom, false);
        setCanAmp(false);
      },
    []
  );

  // Amplify start callback
  const onBonusStart = (bonusType: BonusPeriodConfig) => {
    const red =
      bonusType === BonusPeriodConfig.FRC_2024_AMPLIFY_RED &&
      allianceRef.current === 'red';
    const blue =
      bonusType === BonusPeriodConfig.FRC_2024_AMPLIFY_BLUE &&
      allianceRef.current === 'blue';
    if (red || blue) {
      setAmplifyActive(true);
    }
  };

  // Standard button disable logic
  const stdBtnDisable = matchState !== MatchState.MATCH_IN_PROGRESS;

  // Amplified notes scored counter
  const ampNotesScored =
    (allianceRef.current === 'red'
      ? match?.details?.redTeleSpeakerNotesAmped
      : match?.details?.blueTeleSpeakerNotesAmped) - ampedSpeakerNotesOffset;

  // If alliance hasn't been selected, show alliance selection buttons
  if (!alliance) {
    return (
      <Grid container direction='row' sx={{ height: '100vh', width: '100vw' }}>
        {/* Match state listeners */}
        <PrestartListener />
        <MatchStateListener />
        <MatchUpdateListener />

        {/* Alliance selection buttons */}
        <Grid item xs={6}>
          <Button
            variant='contained'
            color='error'
            fullWidth
            onClick={() => {
              setAlliance('red');
              allianceRef.current = 'red';
            }}
            sx={{ height: '100%', fontSize: '10vw' }}
          >
            RED
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button
            variant='contained'
            color='success'
            fullWidth
            onClick={() => {
              setAlliance('blue');
              allianceRef.current = 'blue';
            }}
            sx={{ height: '100%', fontSize: '10vw' }}
          >
            BLUE
          </Button>
        </Grid>
      </Grid>
    );
  }

  // If alliance has been selected, show amplify and co-op buttons
  return (
    <div
      style={{
        height: '95vh',
        overflow: 'hidden',
        backgroundColor: alliance === 'red' ? 'red' : 'blue'
      }}
    >
      {/* Match state listeners */}
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />

      {/* Match countdown */}
      <Typography variant='h1' sx={{ textAlign: 'center' }}>
        <MatchCountdown
          mode={matchMode === 'TELEOPERATED' ? 'timeLeft' : 'modeTime'}
        />
      </Typography>

      {/* Match and connection chips */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center'
        }}
      >
        <MatchChip match={match} />
        <ConnectionChip />
      </div>

      {/* Amplify and Co-op buttons */}
      <Grid container direction='row' sx={{ height: '90%', width: '100vw' }}>
        <Grid item xs={6}>
          {!amplifyActive ? (
            <Button
              variant='contained'
              color='info'
              fullWidth
              disabled={stdBtnDisable || !canAmp}
              onClick={onAmp}
              sx={{ height: '100%', fontSize: '10vw' }}
            >
              AMPLIFY
            </Button>
          ) : (
            <>
              <Typography variant='h1' sx={{ textAlign: 'center' }}>
                AMPLIFYING
              </Typography>
              <Typography variant='h6' sx={{ textAlign: 'center' }}>
                Time Remaining (estimated): {ampTimeRemaining}
              </Typography>
              <Typography variant='h6' sx={{ textAlign: 'center' }}>
                Amplified Notes Scored: {ampNotesScored}/4
              </Typography>
            </>
          )}
        </Grid>
        <Grid item xs={6}>
          {/* Red alliance has pressed button */}
          {match &&
            match.details &&
            alliance === 'red' &&
            match.details.redActivatedCoop &&
            !match.details.coopertitionBonus && (
              <Typography variant='h1' sx={{ textAlign: 'center' }}>
                Red Co-Opped
              </Typography>
            )}
          {/* Blue alliance has pressed button */}
          {match &&
            match.details &&
            alliance === 'blue' &&
            match.details.blueActivatedCoop &&
            !match.details.coopertitionBonus && (
              <Typography variant='h1' sx={{ textAlign: 'center' }}>
                Blue Co-Opped
              </Typography>
            )}
          {/* Co-op has been obtained (both alliance have pressed button) */}
          {match && match.details && !!match.details.coopertitionBonus && (
            <Typography variant='h1' sx={{ textAlign: 'center' }}>
              Co-Op Obtained
            </Typography>
          )}
          {/* Co-op button, current alliance hasn't pressed */}
          {match &&
            match.details &&
            !match.details.coopertitionBonus &&
            ((alliance === 'red' && !match.details.redActivatedCoop) ||
              (alliance === 'blue' && !match.details.blueActivatedCoop)) && (
              <Button
                variant='contained'
                color='primary'
                fullWidth
                disabled={stdBtnDisable || !canCoop || amplifyActive}
                sx={{ height: '100%', fontSize: '10vw' }}
                onClick={onCoop}
              >
                CO-OP
              </Button>
            )}
        </Grid>
      </Grid>
    </div>
  );
};

export default HumanPlayer;
