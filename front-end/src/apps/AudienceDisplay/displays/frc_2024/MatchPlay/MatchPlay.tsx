import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgressAtom, timer } from 'src/stores/NewRecoil';
import './MatchPlay.less';
import {
  Handshake,
  MusicNote,
  SmartToy,
  SportsEsports
} from '@mui/icons-material';
import MatchBar from '../common/MatchBar';
import { AudienceDisplayProps } from '../../AudienceDisplayProvider';

const MatchPlay: FC<AudienceDisplayProps> = ({
  visible
}: AudienceDisplayProps) => {
  const match = useRecoilValue(matchInProgressAtom);
  const [isAuto, setIsAuto] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  useEffect(() => {
    timer.on('timer:start', onTimerStart);
    timer.on('timer:tele', onTimerTele);
    timer.on('timer:end', onTimerStop);
    timer.on('timer:abort', onTimerStop);

    return () => {
      timer.off('timer:start', onTimerStart);
      timer.off('timer:tele', onTimerTele);
      timer.off('timer:end', onTimerStop);
      timer.off('timer:abort', onTimerStop);
    };
  });

  const onTimerStart = () => setIsRunning(true);
  const onTimerTele = () => setIsAuto(false);
  const onTimerStop = () => setIsRunning(false);

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
                    {match?.details?.blueNotes ?? '0' + ' / 24'}
                  </div>
                </div>

                {/* Co-op Bonus */}
                <div
                  className={`c-dtl-coop ${
                    match?.details?.coopertition ? 'blue-bg' : ''
                  }`}
                >
                  {match?.details?.coopertition && (
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
                  className={`c-dtl-coop ${
                    match?.details?.coopertition ? 'red-bg' : ''
                  }`}
                >
                  {match?.details?.coopertition && (
                    <div className='c-dtl-coop-text'>
                      <Handshake fontSize='inherit' />
                    </div>
                  )}
                </div>

                {/* Red Notes */}
                <div className='c-dtl-notes'>
                  <div className='c-dtl-content'>
                    {match?.details?.blueNotes ?? '0' + ' / 24'}
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
