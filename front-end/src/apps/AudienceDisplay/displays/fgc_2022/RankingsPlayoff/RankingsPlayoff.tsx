import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { allinaceMembers, rankings } from 'src/stores/Recoil';
import './RankingsPlayoff.less';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';

interface Props {
  tournamentLevel: number;
}

const RankingsPlayoffs: FC<Props> = ({ tournamentLevel }) => {
  const levelRankings = useRecoilValue(rankings(tournamentLevel));
  const levelMembers = useRecoilValue(allinaceMembers);
  const levelAlliances = levelMembers.filter(
    (a) => a.tournamentLevel === tournamentLevel && Boolean(a.isCaptain)
  );
  const allianceRankings = levelRankings.filter((r) =>
    levelAlliances.find((a) => a.teamKey === r.teamKey)
  );
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
              {allianceRankings.map((r) => (
                <tr key={r.rankKey}>
                  <td>{r.rank}</td>
                  {levelRankings
                    .filter((a) => a.rank === r.rank)
                    .map((a) => (
                      <td key={a.allianceKey}>{a.team?.city}</td>
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
