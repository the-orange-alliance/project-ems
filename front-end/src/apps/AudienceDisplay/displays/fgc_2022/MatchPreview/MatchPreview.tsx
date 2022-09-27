import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { loadedMatchKey, matchInProgressAtom } from 'src/stores/Recoil';
import './MatchPreview.css';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';
import RED_FLAG from '../res/Red_Team_Tag.png';
import BLUE_FLAG from '../res/Blue_Team_Tag.png';
import { MatchParticipant } from '@toa-lib/models';

const Participant: FC<{ participant: MatchParticipant }> = ({
  participant
}) => {
  return (
    <div className='pre-match-alliance-row pre-match-border'>
      <div className={'pre-match-flag'}>
        <span className={'flag-icon flag-border flag-icon-az'} />
      </div>
      <div className={'pre-match-team'}>(AZU)&nbsp;(Team Afhanistan)</div>
      <div className='pre-match-rank'>#5</div>
    </div>
  );
};

const MatchPreview: FC = () => {
  const matchKey = useRecoilValue(loadedMatchKey);
  const match = useRecoilValue(matchInProgressAtom(matchKey || ''));

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div id='fgc-container'>
        <div id='fgc-pre-header'>
          <img
            alt={'fgc logo'}
            id='fgc-pre-logo'
            className={'fit-h'}
            src={FGC_LOGO}
          />
        </div>
        <div id='fgc-pre-match-info'>
          <div id='fgc-pre-match-info-left'>
            <div className='pre-match-info-left center'>
              <span>MATCH</span>
            </div>
            <div className='pre-match-info-right center'>
              <span>{match?.matchName}</span>
            </div>
          </div>
          <div id='fgc-pre-match-info-left'>
            <div className='pre-match-info-left center'>
              <span>FIELD</span>
            </div>
            <div className='pre-match-info-right center'>
              <span>{match?.fieldNumber}</span>
            </div>
          </div>
        </div>
        <div className='pre-match-alliance'>
          <div className='pre-match-alliance-left'>
            <img alt={'red flag'} src={RED_FLAG} className='fit-h' />
          </div>
          <div className='pre-match-alliance-right'>
            {redAlliance?.map((p) => (
              <Participant key={p.matchParticipantKey} participant={p} />
            ))}
          </div>
        </div>
        <div className='pre-match-alliance'>
          <div className='pre-match-alliance-left'>
            <img alt={'blue flag'} src={BLUE_FLAG} className='fit-h' />
          </div>
          <div className='pre-match-alliance-right'>
            {blueAlliance?.map((p) => (
              <Participant key={p.matchParticipantKey} participant={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
