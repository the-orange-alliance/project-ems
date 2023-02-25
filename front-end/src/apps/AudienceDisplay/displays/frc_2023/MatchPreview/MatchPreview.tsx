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
      <div id='cu-header'>
        <div id='cu-header-up-next'>Up Next</div>
        <div id='cu-header-match'>{match?.name}</div>
        <div id='cu-header-logo'></div>
      </div>
      <div id='cu-teams'>
        <div id='cu-teams-red'>
          {redAlliance.map((p) => (
            <div className='cu-team' key={p.teamKey}>
              <div className='cu-team-team-number'>{p?.teamKey}</div>
              <div className='cu-team-team-name'>{p?.team?.teamNameLong}</div>
            </div>
          ))}
        </div>
        <div id='cu-teams-blue'>
          {blueAlliance.map((p) => (
            <div className='cu-team' key={p.teamKey}>
              <div className='cu-teams-team-number'>{p?.teamKey}</div>
              <div className='cu-teams-team-name'>{p?.team?.teamNameLong}</div>
            </div>
          ))}
        </div>
      </div>
      <div id='cu-footer'></div>
    </div>
  );
};

export default MatchPreview;
