import {
  defaultCarbonCaptureDetails,
  isCarbonCaptureDetails,
  Match,
  MatchParticipant,
  MatchSocketEvent
} from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { matchInProgress, timer } from 'src/stores/Recoil';
import './MatchPlay.less';
import { useSocket } from 'src/api/SocketProvider';

import FGC_LOGO from '../res/Global_Logo.png';
import STORAGE_0_ICON from '../res/Storage_Level_0.png';
import STORAGE_1_ICON from '../res/Storage_Level_1.png';
import STORAGE_2_ICON from '../res/Storage_Level_2.png';
import STORAGE_3_ICON from '../res/Storage_Level_3.png';
import STORAGE_4_ICON from '../res/Storage_Level_4.png';
import { useSearchParams } from 'react-router-dom';

function getName(name: string): string {
  const params = name.split(' ');
  if (params.length <= 1) return name;
  return params.length === 3 ? params[2] : `${name.charAt(0)}${params[3]}`;
}

const LeftParticipant: FC<{ participant: MatchParticipant; level: number }> = ({
  participant,
  level
}) => {
  return (
    <div className='team'>
      <StorageStatus level={level} />
      <div className='team-name-left-p'>
        <span>{participant.team?.country}</span>
      </div>
      <div className='team-flag'>
        <span
          className={
            'flag-icon flag-icon-' + participant.team?.countryCode.toLowerCase()
          }
        />
      </div>
    </div>
  );
};

const RightParticipant: FC<{
  participant: MatchParticipant;
  level: number;
}> = ({ participant, level }) => {
  return (
    <div className='team'>
      <div className='team-flag'>
        <span
          className={
            'flag-icon flag-icon-' +
            participant?.team?.countryCode.toLocaleLowerCase()
          }
        />
      </div>
      <div className='team-name-right-p'>
        <span>{participant.team?.country}</span>
      </div>
      <StorageStatus level={level} />
    </div>
  );
};

const StorageStatus: FC<{ level: number }> = ({ level }) => {
  const getImg = () => {
    switch (level) {
      case 1:
        return STORAGE_1_ICON;
      case 2:
        return STORAGE_2_ICON;
      case 3:
        return STORAGE_3_ICON;
      case 4:
        return STORAGE_4_ICON;
      default:
        return STORAGE_0_ICON;
    }
  };

  return <img src={getImg()} className='fit-h' />;
};

const MatchPlay: FC = () => {
  const [match, setMatch] = useRecoilState(matchInProgress);
  const [socket, connected] = useSocket();
  const someDetails = match?.details;
  const [searchParams] = useSearchParams();
  const flip = searchParams.get('flip') === 'true';

  const redAlliance = match?.participants
    ?.filter((p) => p.station < 20)
    .slice(0, 3);
  const blueAlliance = match?.participants
    ?.filter((p) => p.station >= 20)
    .slice(0, 3);

  const name = getName(match ? match.matchName : '');

  const details = isCarbonCaptureDetails(someDetails)
    ? someDetails
    : defaultCarbonCaptureDetails;
  const redStorage = [
    details.redRobotOneStorage,
    details.redRobotTwoStorage,
    details.redRobotTwoStorage
  ];
  const blueStorage = [
    details.blueRobotOneStorage,
    details.blueRobotTwoStorage,
    details.blueRobotThreeStorage
  ];

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.UPDATE, matchUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.UPDATE, matchUpdate);
    };
  }, []);

  const matchUpdate = (newMatch: Match) => {
    if (timer.inProgress()) {
      setMatch(newMatch);
    }
  };

  return (
    <div>
      <div id='play-display-base'>
        <div id='play-display-base-top'>
          <div id='play-display-left-score'>
            <div className={`teams left-score ${flip ? 'blue-bg' : 'red-bg'}`}>
              {(flip ? blueAlliance : redAlliance)?.map((p, i) => (
                <LeftParticipant
                  key={p.matchParticipantKey}
                  participant={p}
                  level={redStorage[i]}
                />
              ))}
            </div>
          </div>
          <div id='play-display-center'>
            <div id='score-container-header'>
              <img alt={'fgc logo'} src={FGC_LOGO} className='fit-w' />
            </div>
            <div id='score-container-timer'>
              <span>
                <MatchCountdown audio />
              </span>
            </div>
            <div id='score-container-scores'>
              {!flip && (
                <div id='score-container-red'>
                  <div className='red-bg center'>
                    <span>{match?.redScore || 0}</span>
                  </div>
                </div>
              )}
              {flip && (
                <div id='score-container-blue'>
                  <div className='blue-bg center'>
                    <span>{match?.blueScore || 0}</span>
                  </div>
                </div>
              )}
              <div id='score-container-sink'>
                <div id='score-container-sink-fill' />
                <div
                  id='score-container-sink-complete'
                  style={{ top: `${(1 - details.carbonPoints / 165) * 100}%` }}
                  className={
                    details.coopertitionBonusLevel > 0 ? 'coopertition' : ''
                  }
                />
              </div>
              {flip && (
                <div id='score-container-red'>
                  <div className='red-bg center'>
                    <span>{match?.redScore || 0}</span>
                  </div>
                </div>
              )}
              {!flip && (
                <div id='score-container-blue'>
                  <div className='blue-bg center'>
                    <span>{match?.blueScore || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div id='play-display-right-score'>
            <div className={`teams right-score ${flip ? 'red-bg' : 'blue-bg'}`}>
              {(flip ? redAlliance : blueAlliance)?.map((p, i) => (
                <RightParticipant
                  key={p.matchParticipantKey}
                  participant={p}
                  level={blueStorage[i]}
                />
              ))}
            </div>
          </div>
        </div>
        <div id='play-display-base-bottom'>
          <div className='info-col'>
            <span className='info-field'>MATCH: {name}</span>
          </div>
          <div className='info-col'>
            <span className='info-field'>FIRST Global 2022</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlay;
