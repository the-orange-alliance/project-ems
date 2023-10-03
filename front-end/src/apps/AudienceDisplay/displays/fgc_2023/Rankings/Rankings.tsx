import { FC, useEffect } from 'react';
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilValue,
  useSetRecoilState
} from 'recoil';
import './Rankings.less';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';
import {
  currentRankingsByMatchSelector,
  currentRankingsByTournamentSelector,
  currentTournamentKeyAtom
} from 'src/stores/NewRecoil';
import { useSearchParams } from 'react-router-dom';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import { HydrogenHorizons } from '@toa-lib/models';

const Rankings: FC = () => {
  // Get which tournament level we're using from query parameters.
  const [searchParams] = useSearchParams();
  const tournament = searchParams.get('tournament') ?? '0';
  const setTournament = useSetRecoilState(currentTournamentKeyAtom);
  const rankings: HydrogenHorizons.SeasonRanking[] | null = useRecoilValue(
    currentRankingsByTournamentSelector
  ) as HydrogenHorizons.SeasonRanking[] | null;
  const rankingsRefresh = useRecoilRefresher_UNSTABLE(
    currentRankingsByMatchSelector
  );
  const identifiers = useTeamIdentifiers();

  useEffect(() => {
    setTournament(tournament);
    rankingsRefresh();
  }, [tournament]);

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div>
        <div
          className='fgc-rank-container'
          style={{ width: '100vw', height: '100vh' }}
        >
          <img src={FGC_LOGO} className='fgc-rank-img' />
          <h2>Rankings</h2>
          <table id='fgc-rank-table'>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Played</th>
                <th>Ranking Score</th>
                <th>High Score</th>
                <th>Oxygen/Hydrogen Points</th>
              </tr>
            </thead>
            <tbody>
              {rankings?.map((r) => {
                return (
                  <tr key={`${r.eventKey}-${r.tournamentKey}-${r.teamKey}`}>
                    <td>{r.rank}</td>
                    <td>{r.played}</td>
                    <td>{identifiers[r.teamKey]}</td>
                    <td>{r.rankingScore}</td>
                    <td>{r.highestScore}</td>
                    <td>{r.oxyHydroPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
