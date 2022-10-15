import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { rankings } from 'src/stores/Recoil';

import FGC_BG from '../res/global-bg.png';

interface Props {
  tournamentLevel: number;
}

const RankingsPlayoffs: FC<Props> = ({ tournamentLevel }) => {
  const levelRankings = useRecoilValue(rankings(tournamentLevel));

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div id='fgc-container'>
        <div style={{ color: 'white' }}>
          {levelRankings.map((r) => (
            <div key={r.rankKey}>
              {r?.rank}
              {r.team?.city}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RankingsPlayoffs;
