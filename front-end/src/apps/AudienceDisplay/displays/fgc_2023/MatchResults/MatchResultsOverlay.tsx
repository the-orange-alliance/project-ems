import { FC, useEffect } from 'react';
import {
  HydrogenHorizons,
  Match,
  MatchParticipant,
  Ranking
} from '@toa-lib/models';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';
import '../Styles.css';
import './MatchResults.css';
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import {
  currentRankingsByMatchSelector,
  matchResultAtom
} from 'src/stores/NewRecoil';

// Icons
import CARBON_ICON from '../res/Carbon_Points.png';
import STORAGE_1_ICON from '../res/Storage_Level_1.png';
import STORAGE_2_ICON from '../res/Storage_Level_2.png';
import COOPERTITION_ICON from '../res/Coopertition_Points.png';
import PENALTY_ICON from '../res/Penalty.png';

function getName(name: string): string {
  const params = name.split(' ');
  if (params.length <= 1) return name;
  return params.length === 3 ? params[2] : `${name.charAt(0)}${params[3]}`;
}

const Participant: FC<{ participant: MatchParticipant; ranking?: Ranking }> = ({
  participant,
  ranking
}) => {
  const isRed = participant.station < 20;
  return (
    <div className={`res-team-row bottom-${isRed ? 'red' : 'blue'}`}>
      <div className='res-team-name'>{participant?.team?.teamNameLong}</div>
      <div className='res-team-rank'>
        {ranking &&
          (participant.station === 11 || participant.station === 21) && (
            <span>
              {ranking.rankChange > 0 ? (
                <div className='center'>
                  #{ranking.rank} (<NorthIcon />
                  {ranking.rankChange})
                </div>
              ) : (
                <div className='center'>
                  #{ranking.rank} (<SouthIcon />
                  {Math.abs(ranking.rankChange)})
                </div>
              )}
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

const MatchResultsOverlay: FC = () => {
  const match: Match<HydrogenHorizons.MatchDetails> | null =
    useRecoilValue(matchResultAtom);
  const rankings = useRecoilValue(currentRankingsByMatchSelector);
  const rankingsRefresh = useRecoilRefresher_UNSTABLE(
    currentRankingsByMatchSelector
  );
  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);
  const name = getName(match?.name ?? '');
  useEffect(() => {
    rankingsRefresh();
  }, [match]);
  return (
    <div id='fgc-body' style={{ backgroundImage: 'none' }}>
      <div id='fgc-results-overlay-container'>
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
            <div className='res-card-middle fgc-red-bg'>
              <div className='res-card-teams'>
                {redAlliance?.map((p) => (
                  <Participant
                    key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                    participant={p}
                    ranking={rankings?.find((r) => r.teamKey === p.teamKey)}
                  />
                ))}
              </div>
              <div className='res-card-details'>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={CARBON_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    HYDROGEN POINTS
                  </div>
                  <div className='res-detail-right'>
                    {match?.details?.redHydrogenPoints}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={CARBON_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>OXYGEN POINTS</div>
                  <div className='res-detail-right'>
                    {match?.details?.redOxygenPoints}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_1_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    ALIGNMENT MULTIPLIER
                  </div>
                  <div className='res-detail-right'>
                    x{match?.details?.redAlignment}
                  </div>
                </div>
                <div className='res-detail-row bottom-red'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_2_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-red'>
                    PROFICIENCY BONUS
                  </div>
                  <div className='res-detail-right'>{0}</div>
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
                  <div className='res-detail-right'>+{0}</div>
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
            <div className='res-card-middle fgc-blue-bg'>
              <div className='res-card-teams'>
                {blueAlliance?.map((p) => (
                  <Participant
                    key={`${p.eventKey}-${p.tournamentKey}-${p.teamKey}`}
                    participant={p}
                    ranking={rankings?.find((r) => r.teamKey === p.teamKey)}
                  />
                ))}
              </div>
              <div className='res-card-details'>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={CARBON_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    HYDROGEN POINTS
                  </div>
                  <div className='res-detail-right'>
                    {match?.details?.blueHydrogenPoints}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={CARBON_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    OXYGEN POINTS
                  </div>
                  <div className='res-detail-right'>
                    {match?.details?.blueOxygenPoints}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_1_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    ALIGNMENT MULTIPLIER
                  </div>
                  <div className='res-detail-right'>
                    {match?.details?.blueAlignment}
                  </div>
                </div>
                <div className='res-detail-row bottom-blue'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={STORAGE_2_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left right-blue'>
                    PROFICIENCY BONUS
                  </div>
                  <div className='res-detail-right'>{0}</div>
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
                  <div className='res-detail-right'>+{0}</div>
                </div>
                <div className='res-detail-row'>
                  <div className='res-detail-icon'>
                    <img alt={'empty'} src={PENALTY_ICON} className='fit-h' />
                  </div>
                  <div className='res-detail-left penalty right-blue'>
                    PENALTY
                  </div>
                  <div className='res-detail-right penalty'>
                    {match?.blueMinPen ? `-${match.blueMinPen * 10}%` : 0}
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

export default MatchResultsOverlay;
