import { FC, useEffect } from 'react';
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import {
  matchInProgressAtom,
  currentRankingsByMatchSelector
} from 'src/stores/NewRecoil';
import { MatchParticipant, Ranking } from '@toa-lib/models';
import './MatchPreview.css';
import '../Styles.css';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';
import RED_FLAG from '../res/Red_Team_Tag.png';
import BLUE_FLAG from '../res/Blue_Team_Tag.png';
import useFitText from 'use-fit-text';

function getName(name: string): string {
  const params = name.split(' ');
  if (params.length <= 1) return name;
  return params.length === 3 ? params[2] : `${name.charAt(0)}${params[3]}`;
}

const Participant: FC<{
  participant: MatchParticipant;
  ranking?: Ranking;
  participantCount?: number;
}> = ({ participant, ranking, participantCount }) => {
  const { fontSize: teamNameFontSize, ref: teamNameRef } = useFitText();
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
      <div
        className={'pre-match-team'}
        style={{
          fontSize: teamNameFontSize,
          height: participantCount === 3 ? '7vh' : '5vh'
        }}
        ref={teamNameRef}
      >
        ({participant?.team?.country})&nbsp;{participant?.team?.teamNameLong}
      </div>
      <div className='pre-match-rank'>{ranking && `#${ranking.rank}`}</div>
    </div>
  );
};

const MatchPreview: FC = () => {
  const match = useRecoilValue(matchInProgressAtom);
  const rankings = useRecoilValue(currentRankingsByMatchSelector);
  const rankingsRefresh = useRecoilRefresher_UNSTABLE(
    currentRankingsByMatchSelector
  );

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

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
          <div id='fgc-pre-match-info-box'>
            <div>{match?.name}</div>
            <div>Field {match?.fieldNumber}</div>
          </div>
        </div>
        <div className='pre-match-alliance'>
          <div className='pre-match-alliance-left'>
            <img alt={'red flag'} src={RED_FLAG} className='fit-h' />
          </div>
          <div className='pre-match-alliance-right'>
            {redAlliance?.map((p) => (
              <Participant
                key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                participant={p}
                ranking={rankings?.find((r) => r.teamKey === p.teamKey)}
                participantCount={redAlliance.length}
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
                key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                participant={p}
                ranking={rankings?.find((r) => r.teamKey === p.teamKey)}
                participantCount={blueAlliance.length}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
