import { FC, useEffect, useState } from 'react';
import { AllianceMember } from '@toa-lib/models';
import './Alliances.less';

import FGC_BG from '../res/global-bg.png';
import FGC_LOGO from '../res/Global_Logo.png';
import { useSocket } from 'src/api/SocketProvider';
import { useRecoilValue } from 'recoil';
import { teamsAtom } from 'src/stores/Recoil';

const Alliances: FC = () => {
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const teams = useRecoilValue(teamsAtom);
  const [socket, connected] = useSocket();

  const allianceCaptains = members.filter((m) => m.isCaptain);

  useEffect(() => {
    if (connected) {
      socket?.on('match:alliance', onUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:alliance', onUpdate);
    };
  }, []);

  const onUpdate = (newAlliances: AllianceMember[]) => {
    setMembers(newAlliances);
  };

  return (
    <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }}>
      <div>
        <div
          className='fgc-alliance-container'
          style={{ width: '100vw', height: '100vh' }}
        >
          <img src={FGC_LOGO} className='fgc-alliance-img' />
          <h2>Playoffs Alliances</h2>
          <table id='fgc-alliance-table'>
            <thead>
              <tr>
                <th rowSpan={2}>Rank</th>
                <th colSpan={4}>Alliance</th>
              </tr>
              <tr>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Team 3</th>
                <th>Team 4</th>
              </tr>
            </thead>
            <tbody>
              {allianceCaptains.map((r) => (
                <tr key={r.allianceKey}>
                  <td>{r.allianceRank}</td>
                  {members
                    .filter((a) => a.allianceRank === r.allianceRank)
                    .map((a) => {
                      const team = teams.find((t) => t.teamKey === a.teamKey);
                      return (
                        <td key={a.allianceKey}>{team ? team.city : ' '}</td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alliances;
