import { FC, useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  Alliance,
  BonusPeriodConfig,
  BonusPeriodSettings,
  Crescendo,
  Match,
  MatchParticipant,
  MatchSocketEvent,
  MatchState
} from '@toa-lib/models';
import StateToggle from '@components/Referee/StateToggle';
import {
  SetterOrUpdater,
  useRecoilCallback,
  useRecoilState,
  useRecoilValue
} from 'recoil';
import {
  blueBonusActiveAtom,
  matchInProgressAtom,
  matchStateAtom,
  redBonusActiveAtom
} from '@stores/NewRecoil';
import NumberInput from '@components/Referee/NumberInput';
import { useSocket } from 'src/api/SocketProvider';

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onUpdate?: (match: Match<Crescendo.MatchDetails>) => void;
}

const TeleScoreSheet: FC<Props> = ({ alliance, participants, onUpdate }) => {
  const [match, setMatch]: [
    Match<Crescendo.MatchDetails> | null,
    SetterOrUpdater<Match<Crescendo.MatchDetails> | null>
  ] = useRecoilState(matchInProgressAtom);
  const matchState = useRecoilValue(matchStateAtom);

  const [socket, connected] = useSocket();
  const bonusActive = useRecoilValue(
    alliance === 'red' ? redBonusActiveAtom : blueBonusActiveAtom
  );

  if (!match || !match.details) return null;

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.BONUS_START, onBonusStart);
      socket?.on(MatchSocketEvent.BONUS_END, onBonusEnd);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.off(MatchSocketEvent.BONUS_START, onBonusStart);
      socket?.off(MatchSocketEvent.BONUS_END, onBonusEnd);
    };
  }, []);

  const onBonusStart = useRecoilCallback(
    ({ set }) =>
      async (bonusType: BonusPeriodConfig) => {
        if (
          bonusType === BonusPeriodConfig.FRC_2024_AMPLIFY_RED &&
          alliance === 'red'
        ) {
          set(redBonusActiveAtom, true);
        } else if (
          bonusType === BonusPeriodConfig.FRC_2024_AMPLIFY_BLUE &&
          alliance === 'blue'
        ) {
          set(blueBonusActiveAtom, true);
        }
      },
    []
  );

  const onBonusEnd = useRecoilCallback(
    ({ set }) =>
      async (bonusType: BonusPeriodConfig) => {
        console.log('bonus end', bonusType, alliance);
        if (
          bonusType === BonusPeriodConfig.FRC_2024_AMPLIFY_RED &&
          alliance === 'red'
        ) {
          set(redBonusActiveAtom, false);
        } else if (
          bonusType === BonusPeriodConfig.FRC_2024_AMPLIFY_BLUE &&
          alliance === 'blue'
        ) {
          set(blueBonusActiveAtom, false);
        }
      },
    []
  );

  const setDetails = (
    key: keyof Crescendo.MatchDetails,
    value: number
  ): Match<Crescendo.MatchDetails> => {
    if (!match || !match.details) return match;
    const details = Object.assign({}, { ...match.details, [key]: value });
    const newMatch = Object.assign({}, { ...match, details });
    onUpdate?.(newMatch);
    return newMatch;
  };

  const handleAmpRegNotes = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redTeleAmpNotes' : 'blueTeleAmpNotes',
        newValue
      )
    );
  };

  const handleSpeakerAmplifiedNotes = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red'
          ? 'redTeleSpeakerNotesAmped'
          : 'blueTeleSpeakerNotesAmped',
        newValue
      )
    );
  };

  const handleSpeakerNotes = (newValue: number) => {
    setMatch(
      setDetails(
        alliance === 'red' ? 'redTeleSpeakerNotes' : 'blueTeleSpeakerNotes',
        newValue
      )
    );
  };

  const getStageStatus = (station: number): number | undefined => {
    switch (station) {
      case 11:
        return match.details?.redEndStageStatusOne;
      case 12:
        return match.details?.redEndStageStatusTwo;
      case 13:
        return match.details?.redEndStageStatusThree;
      case 21:
        return match.details?.blueEndStageStatusOne;
      case 22:
        return match.details?.blueEndStageStatusTwo;
      case 23:
        return match.details?.blueEndStageStatusThree;
      default:
        return 0;
    }
  };

  const updateChargeStatus = (station: number, value: number) => {
    switch (station) {
      case 11:
        setMatch(setDetails('redEndStageStatusOne', value));
        break;
      case 12:
        setMatch(setDetails('redEndStageStatusTwo', value));
        break;
      case 13:
        setMatch(setDetails('redEndStageStatusThree', value));
        break;
      case 21:
        setMatch(setDetails('blueEndStageStatusOne', value));
        break;
      case 22:
        setMatch(setDetails('blueEndStageStatusTwo', value));
        break;
      case 23:
        setMatch(setDetails('blueEndStageStatusThree', value));
        break;
    }
  };

  const handleCoopertition = (newValue: number) => {
    setMatch(setDetails('coopertitionBonus', newValue));
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4} lg={4}>
        <Typography variant='h6' sx={{ textAlign: 'center' }}>
          Amp Notes
        </Typography>
        <NumberInput
          value={
            alliance === 'red'
              ? match.details.redTeleAmpNotes
              : match.details.blueTeleAmpNotes
          }
          onChange={handleAmpRegNotes}
        />
      </Grid>
      {(bonusActive || matchState !== MatchState.MATCH_IN_PROGRESS) && (
        <Grid item xs={12} md={4} lg={4}>
          <Typography variant='h6' sx={{ textAlign: 'center' }}>
            Speaker Amplified Notes
          </Typography>
          <NumberInput
            value={
              alliance === 'red'
                ? match.details.redTeleSpeakerNotesAmped
                : match.details.blueTeleSpeakerNotesAmped
            }
            onChange={handleSpeakerAmplifiedNotes}
          />
        </Grid>
      )}
      {(!bonusActive || matchState !== MatchState.MATCH_IN_PROGRESS) && (
        <Grid item xs={12} md={4} lg={4}>
          <Typography variant='h6' sx={{ textAlign: 'center' }}>
            Speaker Regular Notes
          </Typography>
          <NumberInput
            value={
              alliance === 'red'
                ? match.details.redTeleSpeakerNotes
                : match.details.blueTeleAmpNotes
            }
            onChange={handleSpeakerNotes}
          />
        </Grid>
      )}
      {participants?.map((p) => {
        const update = (value: number) => {
          updateChargeStatus(p.station, value);
        };

        return (
          <Grid item key={`${p.teamKey}-mobility`} xs={12} md={3} lg={3}>
            <StateToggle
              title={`${p.teamKey} Stage Status`}
              states={['None', 'Park', 'ONSTAGE', 'ONSTAGE + SPOTLIT']}
              value={getStageStatus(p.station) ?? 0}
              onChange={update}
              fullWidth
            />
          </Grid>
        );
      })}
      <Grid
        item
        xs={12}
        md={3}
        lg={3}
        sx={{ display: 'flex', flexDirection: 'column' }}
      >
        <StateToggle
          title={`Coopertition Bonus`}
          states={['None', 'Cooperated']}
          value={match.details.coopertitionBonus}
          onChange={handleCoopertition}
          disabled={matchState < MatchState.MATCH_COMPLETE}
          fullWidth
        />
        <Typography sx={{ textAlign: 'center' }}>
          {alliance === 'red' && match.details.redActivatedCoop
            ? 'Red Activated Coop'
            : alliance === 'blue' && match.details.blueActivatedCoop
            ? 'Blue Activated Coop'
            : 'Alliance Coop Not Activated Yet'}
        </Typography>
      </Grid>
    </Grid>
  );
};

export default TeleScoreSheet;
