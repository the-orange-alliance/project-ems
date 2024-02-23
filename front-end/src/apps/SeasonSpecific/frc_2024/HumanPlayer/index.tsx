/* eslint-disable prettier/prettier */
import { Button, Grid, Typography } from '@mui/material';
import { MatchSocketEvent, MatchState } from '@toa-lib/models';
import { FC, useEffect, useRef, useState } from 'react';
import { useRecoilCallback, useRecoilValue, } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import ConnectionChip from 'src/components/ConnectionChip/ConnectionChip';
import MatchChip from 'src/components/MatchChip/MatchChip';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import {
  matchInProgressAtom,
  matchStateAtom,
  matchStatusAtom,
  timer
} from 'src/stores/NewRecoil';

const HumanPlayer: FC = () => {
  const matchMode = useRecoilValue(matchStatusAtom); // "TELEOPERATED" or "ENDGAME"
  const matchState = useRecoilValue(matchStateAtom);
  const [canAmp, setCanAmp] = useState(false);
  const [canCoop, setCanCoop] = useState(false);
  const [alliance, setAlliance] = useState<null | 'red' | 'blue'>(null);
  const allianceRef = useRef<'red' | 'blue' | null>(alliance);
  const socketRef = useRef<any>(null);
  const [socket, connected] = useSocket();
  const match = useRecoilValue(matchInProgressAtom);

  useEffect(() => {
    socketRef.current = socket;
    if (connected) {
      socket?.on('game:amplify', (state: { state: boolean }) => {
        setCanAmp(state.state);
      });
    }
  }, [connected]);

  useEffect(() => {

    const tick = setInterval(() => {
      // Can't co-op after first 45 seconds in match
      if (timer.timeLeft <= 90) {
        setCanCoop(false);
      }
    }, 500);

    return () => {
      socket?.removeListener('game:amplify', setAmp);
      clearInterval(tick);
    };
  }, []);


  // We subscribe to match details updates and calculate if we can co-op when the score updates
  useEffect(() => {
    // Determine if we're within co-oping range
    // Must be in progress and in teleop
    const matchStateCorrect = matchState === MatchState.MATCH_IN_PROGRESS;
    const matchModeCorrect = matchMode === 'TELEOPERATED';
    // Must have at least 1 amp point
    const has1AmpPointRed = (match?.details?.redTeleAmpNotes ?? 0) + (match?.details?.redAutoAmpNotes ?? 0) > 0;
    const has1AmpPointBlue = (match?.details?.blueTeleAmpNotes ?? 0) + (match?.details?.blueAutoAmpNotes ?? 0) > 0;
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
  }, [match, matchState, matchMode]);

  const setAmp = (state: { state: boolean }) => {
    setCanAmp(state.state);
  };

  const onCoop = useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const currMatch = await snapshot.getPromise(matchInProgressAtom);
        if (!currMatch) return;
        let details;
        if (allianceRef.current === 'red') {
          details = Object.assign({}, { ...currMatch.details, redActivatedCoop: true });
        } else {
          details = Object.assign({}, { ...currMatch.details, blueActivatedCoop: true });
        }

        if (details.redActivatedCoop && details.blueActivatedCoop) {
          details = Object.assign({}, { ...details, coopertitionBonus: 1 });
        }

        const newMatch = Object.assign({}, { ...currMatch, details });
        socketRef.current?.emit(MatchSocketEvent.UPDATE, newMatch);
        set(matchInProgressAtom, newMatch);
      }, []
  );

  // Standard button disable logic
  const stdBtnDisable = matchState !== MatchState.MATCH_IN_PROGRESS;

  if (!alliance) {
    return (
      <Grid container direction='row' sx={{ height: '100vh', width: '100vw' }}>
        <Grid item xs={6}>
          <Button
            variant='contained'
            color='error'
            fullWidth
            onClick={() => { setAlliance('red'); allianceRef.current = 'red' }}
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
            onClick={() => { setAlliance('blue'); allianceRef.current = 'blue' }}
            sx={{ height: '100%', fontSize: '10vw' }}
          >
            BLUE
          </Button>
        </Grid>
      </Grid>
    );
  }

  return (
    <div
      style={{
        height: '95vh',
        overflow: 'hidden',
        backgroundColor: alliance === 'red' ? 'red' : 'blue'
      }}
    >
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
      <div style={{ display: 'flex', flexDirection: "row", justifyContent: "center" }}>
        <MatchChip match={match} />
        <ConnectionChip />
      </div>

      {/* Amplify and Co-op buttons */}
      <Grid container direction='row' sx={{ height: '90%', width: '100vw' }}>
        <Grid item xs={6}>
          <Button
            variant='contained'
            color='info'
            fullWidth
            disabled={stdBtnDisable}
            sx={{ height: '100%', fontSize: '10vw' }}
          >
            AMPLIFY
          </Button>
        </Grid>
        <Grid item xs={6}>
          {/* Red alliance has pressed button */}
          {match && match.details && alliance === "red" && match.details.redActivatedCoop && !match.details.coopertitionBonus && <Typography variant='h1' sx={{ textAlign: 'center' }}>Red Co-Opped</Typography>}
          {/* Blue alliance has pressed button */}
          {match && match.details && alliance === "blue" && match.details.blueActivatedCoop && !match.details.coopertitionBonus && <Typography variant='h1' sx={{ textAlign: 'center' }}>Blue Co-Opped</Typography>}
          {/* Co-op has been obtained (both alliance have pressed button) */}
          {match && match.details && !!match.details.coopertitionBonus && <Typography variant='h1' sx={{ textAlign: 'center' }}>Co-Op Obtained</Typography>}
          {/* Co-op button, current alliance hasn't pressed */}
          {match && match.details && !match.details.coopertitionBonus && (alliance === 'red' && !match.details.redActivatedCoop || alliance === 'blue' && !match.details.blueActivatedCoop) && (
            <Button
              variant='contained'
              color='primary'
              fullWidth
              disabled={stdBtnDisable || !canCoop}
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
