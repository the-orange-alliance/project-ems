import { FC, useEffect } from 'react';
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import { matchResult, rankingsByMatch } from 'src/stores/Recoil';
import './MatchResults.css';

import FGC_BG from '../res/global-bg.png';
import RED_WIN from '../res/Red_Win_Top.png';
import RED_LOSE from '../res/Red_Lose_Top.png';
import BLUE_WIN from '../res/Blue_Win_Top.png';
import BLUE_LOSE from '../res/Blue_Lose_Top.png';

// Icons
import CARBON_ICON from '../res/Carbon_Points.png';
import STORAGE_1_ICON from '../res/Storage_Level_1.png';
import STORAGE_2_ICON from '../res/Storage_Level_2.png';
import STORAGE_3_ICON from '../res/Storage_Level_3.png';
import STORAGE_4_ICON from '../res/Storage_Level_4.png';
import COOPERTITION_ICON from '../res/Coopertition_Points.png';
import PENALTY_ICON from '../res/Penalty.png';

import {
  defaultCarbonCaptureDetails,
  isCarbonCaptureDetails,
  MatchParticipant,
  Ranking
} from '@toa-lib/models';

const Participant: FC<{ participant: MatchParticipant; ranking?: Ranking }> = ({
  participant,
  ranking
}) => {
  return (
    <div className='res-team-row bottom-red'>
      <div className='res-team-name'>{participant?.team?.teamNameLong}</div>
      <div className='res-team-rank'>
        {ranking && (
          <span>
            {ranking.rankChange >= 0
              ? `#${ranking.rank} (+${ranking.rankChange})`
              : `#${ranking.rank} (${ranking.rankChange})`}
          </span>
        )}
      </div>
      <div className='res-team-flag'>
        <span
          className={
            'flag-icon flag-border flag-icon-' +
            participant?.team?.countryCode.toLowerCase()
          }
        />
      </div>
    </div>
  );
};

const MatchResults: FC = () => {
  const match = useRecoilValue(matchResult);
  const rankings = useRecoilValue(rankingsByMatch(match?.matchKey || ''));
  const rankingsRefresh = useRecoilRefresher_UNSTABLE(
    rankingsByMatch(match?.matchKey || '')
  );

  const someDetails = match?.details;

  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  const name = match?.matchName ? match.matchName.split(' ')[2] : '';

  const details = isCarbonCaptureDetails(someDetails)
    ? someDetails
    : defaultCarbonCaptureDetails;

  const redScore = match?.redScore || 0;
  const blueScore = match?.blueScore || 0;

  const redTop =
    redScore > blueScore
      ? RED_WIN
      : redScore === blueScore
      ? RED_WIN
      : RED_LOSE;
  const blueTop =
    blueScore > redScore
      ? BLUE_WIN
      : redScore === blueScore
      ? BLUE_WIN
      : BLUE_LOSE;

  const redStorage = [
    details.redRobotOneStorage,
    details.redRobotTwoStorage,
    details.redRobotThreeStorage
  ];
  const blueStorage = [
    details.blueRobotOneStorage,
    details.blueRobotTwoStorage,
    details.blueRobotThreeStorage
  ];

  useEffect(() => {
    rankingsRefresh();
  }, [match]);

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div id='fgc-container'>
        <div id='res-header-container'>
          <div id='res-header-left'>
            <span>RESULTS</span>
          </div>
          <div id='res-header-right'>
            <div className='res-header-item'>MATCH: {name}</div>
            <div className='res-header-item'>FIELD: {match?.fieldNumber}</div>
          </div>
        </div>
        <div id='res-alliance-container'>
          <div className='res-alliance-card'>
            <div className='res-card-top'>
              <img alt={'red top'} src={redTop} className='fit-w' />
            </div>
            <div className='res-card-middle fgc-red-bg'>
              <div className='res-card-teams'>
                {redAlliance?.map((p) => (
                  <Participant
                    key={p.matchParticipantKey}
                    participant={p}
                    ranking={rankings.find((r) => r.teamKey === p.teamKey)}
                  />
                ))}
              </div>
              <div className='res-card-details'>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={CARBON_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>CARBON POINTS</div>
                  <div className='res-detail-right'>{details.carbonPoints}</div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_1_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    STORAGE LEVEL 1
                  </div>
                  <div className='res-detail-right'>
                    {redStorage.filter((s) => s === 1).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_2_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    STORAGE LEVEL 2
                  </div>
                  <div className='res-detail-right'>
                    {redStorage.filter((s) => s === 2).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_3_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    STORAGE LEVEL 3
                  </div>
                  <div className='res-detail-right'>
                    {redStorage.filter((s) => s === 3).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_4_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    STORAGE LEVEL 4
                  </div>
                  <div className='res-detail-right'>
                    {redStorage.filter((s) => s === 4).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img
                      alt={'empty'}
                      src={COOPERTITION_ICON}
                      className='fit-h'
                    />
                  </div>
                  <div className='res-detail-left right-red'>
                    COOPERTITION BONUS
                  </div>
                  <div className='res-detail-right'>
                    +{details.coopertitionBonusLevel * 100}
                  </div>
                </div>
                <div className='res-detail-row'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={PENALTY_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left penalty right-red'>
                    PENALTY
                  </div>
                  <div className='res-detail-right penalty'>
                    {match?.redMinPen ? `-${match.redMinPen * 10}%` : 0}
                  </div>
                </div>
              </div>
            </div>
            <div className='res-card-bottom'>
              <div className='res-alliance-total-left fgc-red-bg'>
                <span>TOTAL:</span>
              </div>
              <div className='res-alliance-total-right fgc-red-bg'>
                <span>{match?.redScore}</span>
              </div>
            </div>
          </div>
          <div className='res-alliance-card'>
            <div className='res-card-top'>
              <img alt={'blue top'} src={blueTop} className='fit-w' />
            </div>
            <div className='res-card-middle fgc-blue-bg'>
              <div className='res-card-teams'>
                {blueAlliance?.map((p) => (
                  <Participant
                    key={p.matchParticipantKey}
                    participant={p}
                    ranking={rankings.find((r) => r.teamKey === p.teamKey)}
                  />
                ))}
              </div>
              <div className='res-card-details'>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={CARBON_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    CARBON POINTS
                  </div>
                  <div className='res-detail-right'>{details.carbonPoints}</div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_1_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    STORAGE LEVEL 1
                  </div>
                  <div className='res-detail-right'>
                    {blueStorage.filter((s) => s === 1).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_2_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    STORAGE LEVEL 2
                  </div>
                  <div className='res-detail-right'>
                    {blueStorage.filter((s) => s === 2).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_3_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    STORAGE LEVEL 3
                  </div>
                  <div className='res-detail-right'>
                    {blueStorage.filter((s) => s === 3).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_4_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    STORAGE LEVEL 4
                  </div>
                  <div className='res-detail-right'>
                    {blueStorage.filter((s) => s === 4).length}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img
                      alt={'empty'}
                      src={COOPERTITION_ICON}
                      className='fit-h'
                    />
                  </div>
                  <div className='res-detail-left right-blue'>
                    COOPERTITION BONUS
                  </div>
                  <div className='res-detail-right'>
                    +{details.coopertitionBonusLevel * 100}
                  </div>
                </div>
                <div className='res-detail-row'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={PENALTY_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left penalty right-blue'>
                    PENALTY
                  </div>
                  <div className='res-detail-right penalty'>
                    {match?.blueMinPen ? `-${match.redMinPen * 10}%` : 0}
                  </div>
                </div>
              </div>
            </div>
            <div className='res-card-bottom'>
              <div className='res-alliance-total-left fgc-blue-bg'>
                <span>TOTAL:</span>
              </div>
              <div className='res-alliance-total-right fgc-blue-bg'>
                <span>{match?.blueScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchResults;
