import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import {
  currentEventSelector,
  matchInProgressAtom
} from 'src/stores/NewRecoil';
import './MatchPreview.less';

const MatchPreview: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  const match = useRecoilValue(matchInProgressAtom);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  return (
    <div id='cu-body'>
      <div id='cu-container'>
        <div id='cu-pre-top' className='cu-border'>
          <div className='center-items cu-pre-match'>{match?.name}</div>
        </div>
        <div id='cu-pre-mid' className='cu-border'>
          <div id='cu-pre-mid-labels' className='center-items'>
            <div className='cu-pre-team'>Team #</div>
            <div className='cu-pre-name'>Nickname</div>
            <div className='cu-pre-rank'>Rank #</div>
          </div>
          <div className='cu-pre-mid-alliance'>
            {redAlliance.map((p) => (
              <div
                key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                className='center-items red-border'
              >
                <div className='cu-pre-team center-left-items'>{p.teamKey}</div>
                <div className='cu-pre-name center-left-items'>
                  {p.team?.teamNameLong}
                </div>
                <div className='cu-pre-rank center-items'>#0</div>
              </div>
            ))}
          </div>
          <div className='cu-pre-mid-alliance'>
            {blueAlliance.map((p) => (
              <div
                key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                className='center-items blue-border'
              >
                <div className='cu-pre-team center-left-items'>{p.teamKey}</div>
                <div className='cu-pre-name center-left-items'>
                  {p.team?.teamNameLong}
                </div>
                <div className='cu-pre-rank center-items'>#0</div>
              </div>
            ))}
          </div>
        </div>
        <div id='cu-pre-bot' className='cu-border'>
          <div className='cu-bot-text'>
            <span>{event?.eventName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
