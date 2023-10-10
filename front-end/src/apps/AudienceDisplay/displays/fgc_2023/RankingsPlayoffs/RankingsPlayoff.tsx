import { FC, useEffect } from 'react';
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import {
  allianceMembersByEventAtomFam,
  currentEventKeyAtom,
  matchResultAtom,
  rankingsByEventAtomFam
} from 'src/stores/NewRecoil';
import './RankingsPlayoff.less';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';
import { useSearchParams } from 'react-router-dom';

const RankingsPlayoffs: FC = () => {
  const match = useRecoilValue(matchResultAtom);
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const allianceMembers = useRecoilValue(
    allianceMembersByEventAtomFam(eventKey)
  );
  const rankings = useRecoilValue(rankingsByEventAtomFam(eventKey));

  const [searchParams] = useSearchParams();
  const tournamentKey = searchParams.get('tournamentKey') ?? '0';

  const levelRankings = rankings.filter(
    (r) => r.tournamentKey === tournamentKey
  );
  const levelMembers = allianceMembers.filter(
    (a) => a.tournamentKey === tournamentKey
  );
  const levelAlliances = levelMembers.filter(
    (a) => a.tournamentKey === tournamentKey && Boolean(a.isCaptain)
  );
  const allianceRankings = levelRankings
    .filter((r) => levelAlliances.find((a) => a.teamKey === r.teamKey))
    .map((r) => ({
      ...r,
      allianceRank: levelAlliances.find((a) => a.teamKey === r.teamKey)
        ?.allianceRank
    }))
    .sort((a, b) => a.rank - b.rank);

  const refreshRankings = useRecoilRefresher_UNSTABLE(
    rankingsByEventAtomFam(eventKey)
  );

  useEffect(() => {
    refreshRankings();
  }, [match]);

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div>
        <div
          className='fgc-rank-container'
          style={{ width: '100vw', height: '100vh' }}
        >
          <img src={FGC_LOGO} className='fgc-rank-img' />
          <h2>Playoffs</h2>
          <table id='fgc-rank-table'>
            <thead>
              <tr>
                <th rowSpan={2}>Rank</th>
                <th colSpan={4}>Alliance</th>
                <th rowSpan={2}>Total Score</th>
              </tr>
              <tr>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Team 3</th>
                <th>Team 4</th>
              </tr>
            </thead>
            <tbody>
              {allianceRankings.map((r, i) => (
                <tr key={`${r.eventKey}-${r.tournamentKey}-${r.allianceRank}`}>
                  <td>{r.rank}</td>
                  {levelRankings
                    .filter((a) =>
                      levelMembers.find(
                        (b) =>
                          b.allianceRank === r.allianceRank &&
                          b.teamKey === a.teamKey
                      )
                    )
                    .map((a, j) => (
                      <td key={`rank-${i}-${j}`}>{a.team?.teamNameShort}</td>
                    ))}
                  <td>{(r as any).rankingScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RankingsPlayoffs;
