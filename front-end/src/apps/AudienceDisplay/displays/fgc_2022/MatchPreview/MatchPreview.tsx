import { FC, useEffect } from 'react';
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import { matchInProgress, rankingsByMatch } from 'src/stores/Recoil';
import { MatchParticipant, Ranking } from '@toa-lib/models';
import './MatchPreview.css';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';
import RED_FLAG from '../res/Red_Team_Tag.png';
import BLUE_FLAG from '../res/Blue_Team_Tag.png';

function getName(name: string): string {
  const params = name.split(' ');
  if (params.length <= 1) return name;
  return params.length === 3 ? params[2] : `${name.charAt(0)}${params[3]}`;
}

const Participant: FC<{ participant: MatchParticipant; ranking?: Ranking }> = ({
  participant,
  ranking
}) => {
  return (
    <div className='pre-match-alliance-row pre-match-border'>
      <div className={'pre-match-flag'}>
        <span
          className={
            'flag-icon flag-border flag-icon-' +
            participant?.team?.countryCode.toLowerCase()
          }
        />
      </div>
      <div className={'pre-match-team'}>
        ({participant?.team?.country})&nbsp;{participant?.team?.teamNameLong}
      </div>
      <div className='pre-match-rank'>
        {ranking &&
          (participant.station === 11 || participant.station === 21) &&
          `#${ranking.rank}`}
      </div>
    </div>
  );
};

const MatchPreview: FC = () => {
  const match = useRecoilValue(matchInProgress);
  const rankings = useRecoilValue(rankingsByMatch(match?.matchKey || ''));
  const rankingsRefresh = useRecoilRefresher_UNSTABLE(
    rankingsByMatch(match?.matchKey || '')
  );

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  const name = getName(match ? match.matchName : '');

  useEffect(() => {
    rankingsRefresh();
  }, [match]);

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
              <span>{name}</span>
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
              <Participant
                key={p.matchParticipantKey}
                participant={p}
                ranking={rankings.find((r) => r.teamKey === p.teamKey)}
              />
            ))}
          </div>
        </div>
        <div className='pre-match-alliance'>
          <div className='pre-match-alliance-left'>
            <img alt={'blue flag'} src={BLUE_FLAG} className='fit-h' />
          </div>
          <div className='pre-match-alliance-right'>
            {blueAlliance?.map((p) => (
              <Participant
                key={p.matchParticipantKey}
                participant={p}
                ranking={rankings.find((r) => r.teamKey === p.teamKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
