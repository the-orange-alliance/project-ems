import { FC, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import MatchUpdateListener from 'src/components/sync-effects/MatchUpdateListener/MatchUpdateListener';
import MatchCountdown from 'src/components/util/MatchCountdown/MatchCountdown';
import {
  matchInProgressAtom,
  matchStatusAtom,
  timer
} from 'src/stores/NewRecoil';
import './MatchPlay.less';
import {
  Handshake,
  MusicNote,
  SmartToy,
  SportsEsports
} from '@mui/icons-material';
import MatchBar from '../common/MatchBar';
import { AudienceDisplayProps } from '../../AudienceDisplayProvider';
import { useSocket } from 'src/api/SocketProvider';
import { BonusPeriodConfig, MatchSocketEvent } from '@toa-lib/models';
import AmpCountdown from '../common/AmpCountdown';

const MatchPlay: FC<AudienceDisplayProps> = ({
  visible
}: AudienceDisplayProps) => {
  const match = useRecoilValue(matchInProgressAtom);
  const matchStatus = useRecoilValue(matchStatusAtom);
  const [isRunning, setIsRunning] = useState(false);
  const [redAmped, setRedAmped] = useState(false);
  const [blueAmped, setBlueAmped] = useState(false);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.BONUS_START, onBonusStart);
      socket?.on(MatchSocketEvent.BONUS_END, onBonusStop);
    }
  }, [connected]);

  useEffect(() => {
    timer.on('timer:start', onTimerStart);
    timer.on('timer:end', onTimerStop);
    timer.on('timer:abort', onTimerStop);

    return () => {
      timer.off('timer:start', onTimerStart);
      timer.off('timer:end', onTimerStop);
      timer.off('timer:abort', onTimerStop);
      socket?.off('bonus:start', onBonusStart);
      socket?.off('bonus:end', onBonusStop);
    };
  });

  const onTimerStart = () => setIsRunning(true);
  const onTimerStop = () => setIsRunning(false);

  const onBonusStart = (type: BonusPeriodConfig) => {
    if (type === BonusPeriodConfig.FRC_2024_AMPLIFY_RED) {
      setRedAmped(true);
    } else if (type === BonusPeriodConfig.FRC_2024_AMPLIFY_BLUE) {
      setBlueAmped(true);
    }
  };

  const onBonusStop = (type: BonusPeriodConfig) => {
    if (type === BonusPeriodConfig.FRC_2024_AMPLIFY_RED) {
      setRedAmped(false);
    } else if (type === BonusPeriodConfig.FRC_2024_AMPLIFY_BLUE) {
      setBlueAmped(false);
    }
  };

  const blueNumNotesScored =
    match?.details?.blueAutoAmpNotes +
    match?.details?.blueAutoSpeakerNotes +
    match?.details?.blueTeleAmpNotes +
    match?.details?.blueTeleSpeakerNotes +
    match?.details?.blueTeleSpeakerNotesAmped +
    match?.details?.blueTeleTrapNotes;

  const redNumNotesScored =
    match?.details?.redAutoAmpNotes +
    match?.details?.redAutoSpeakerNotes +
    match?.details?.redTeleAmpNotes +
    match?.details?.redTeleSpeakerNotes +
    match?.details?.redTeleSpeakerNotesAmped +
    match?.details?.redTeleTrapNotes;

  const coopBonusEarned = !!match?.details?.coopertitionBonus;

  const targetNotes = coopBonusEarned ? 15 : 18;

  const isAuto =
    matchStatus === 'MATCH STARTED' || matchStatus === 'PRESTART COMPLETE';

  return (
    <div>
      <MatchUpdateListener stopAfterMatchEnd />
      <div id='c-play-container' className={visible ? 'in' : ''}>
        {/* Season / Match Information Bar */}
        <MatchBar />

        {/* Match Specific  */}
        <div id='c-play-bot' className='center-items'>
          <div id='c-play-base'>
            <div id='c-play-blue'>
              <div className='c-top-filler blue-bg' />
              <div className='c-teams'>
                {blueAlliance.map((p) => (
                  <div
                    key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                    className='c-play-team'
                  >
                    <span className={'c-card-status ' + ''} />
                    <span>{p.teamKey}</span>
                  </div>
                ))}
              </div>

              {/* Match Details */}
              <div className='c-dtl-row'>
                {/* Blue Notes */}
                <div className='c-dtl-notes'>
                  <div className='c-dtl-title blue-bg'>
                    <MusicNote fontSize={'inherit'} />
                  </div>
                  <div className='c-dtl-content'>
                    {(blueNumNotesScored ?? '0') + ' / ' + targetNotes}
                  </div>
                </div>

                {/* Blue Amplified */}
                <div
                  className={`c-dtl-amplified blue  ${blueAmped ? 'in' : ''}`}
                >
                  <div className='c-ampd-content'>
                    <AmpCountdown amped={blueAmped} color='blue' />
                  </div>
                  <div className='c-ampd-title blue-bg'>Amplified!</div>
                </div>

                {/* Co-op Bonus */}
                <div
                  className={`c-dtl-coop ${coopBonusEarned ? 'blue-bg' : ''}`}
                >
                  {coopBonusEarned && (
                    <div className='c-dtl-coop-text'>
                      <Handshake fontSize='inherit' />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Score Bug */}
            <div id='c-play-mid'>
              <div id='c-play-mid-scores'>
                {/* Blue Score */}
                <div className='c-play-box center-items blue-bg'>
                  <div className='c-play-alliance'>Blue</div>
                  <div className='c-play-score'>{match?.blueScore}</div>
                </div>

                {/* Timer */}
                <div className='c-play-box c-play-timer center-items'>
                  <div className='c-play-alliance'>
                    {isAuto && isRunning ? (
                      <SmartToy fontSize={'inherit'} />
                    ) : !isAuto && isRunning ? (
                      <SportsEsports fontSize={'inherit'} />
                    ) : (
                      '\u00A0'
                    )}{' '}
                    {/* Non-breaking space to maintain space */}
                  </div>
                  <div className='c-play-score'>
                    <MatchCountdown
                      audio
                      mode={isAuto ? 'modeTime' : 'timeLeft'}
                    />
                  </div>
                </div>

                {/* Red Score */}
                <div className='c-play-box center-items red-bg'>
                  <div className='c-play-alliance'>Red</div>
                  <div className='c-play-score'>{match?.redScore}</div>
                </div>
              </div>
            </div>

            {/* Red Alliance Half */}
            <div id='c-play-red'>
              <div className='c-top-filler red-bg' />
              <div className='c-teams'>
                {redAlliance.map((p) => (
                  <div
                    key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                    className='c-play-team'
                  >
                    <span className={'c-card-status ' + ''} />
                    <span>{p.teamKey}</span>
                  </div>
                ))}
              </div>

              {/* Match Details */}
              <div className='c-dtl-row'>
                {/* Co-op Bonus */}
                <div
                  className={`c-dtl-coop ${coopBonusEarned ? 'red-bg' : ''}`}
                >
                  {coopBonusEarned && (
                    <div className='c-dtl-coop-text'>
                      <Handshake fontSize='inherit' />
                    </div>
                  )}
                </div>

                {/* Red Amplified */}
                <div className={`c-dtl-amplified red ${redAmped ? 'in' : ''}`}>
                  <div className='c-ampd-title red-bg'>Amplified!</div>
                  <div className='c-ampd-content'>
                    <AmpCountdown amped={redAmped} color='red' />
                  </div>
                </div>

                {/* Red Notes */}
                <div className='c-dtl-notes'>
                  <div className='c-dtl-content'>
                    {(redNumNotesScored ?? '0') + ' / ' + targetNotes}
                  </div>
                  <div className='c-dtl-title red-bg'>
                    <MusicNote fontSize={'inherit'} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlay;
