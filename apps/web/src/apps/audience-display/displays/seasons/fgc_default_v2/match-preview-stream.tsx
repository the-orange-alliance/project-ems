import { FC } from 'react';
import { DisplayProps } from '../../displays.js';
import { Space } from 'antd';
import { MatchParticipant } from '@toa-lib/models';
import AllianceTeam from './components/alliance-team.js';
import AllianceBox from './components/alliance-box.js';
import L3Header from './components/l3-header.js';
import { useAllianceMember } from 'src/api/use-alliance-data.js';

export const MatchPreviewStream: FC<DisplayProps> = ({ match }) => {
  const redTeams: MatchParticipant[] = [];
  const blueTeams: MatchParticipant[] = [];

  if (match && match.participants) {
    match.participants.forEach((participant) => {
      if (participant.station < 20) {
        redTeams.push(participant);
      } else {
        blueTeams.push(participant);
      }
    });
  }

  const redAllianceNum = useAllianceMember(
    match?.eventKey || '',
    match?.tournamentKey || '',
    redTeams[0]?.teamKey || 0
  );

  const blueAllianceNum = useAllianceMember(
    match?.eventKey || '',
    match?.tournamentKey || '',
    blueTeams[0]?.teamKey || 0
  );

  const redHeader = redAllianceNum
    ? `Red (${redAllianceNum.allianceNameLong})`
    : 'Red';
  const blueHeader = blueAllianceNum
    ? `Blue (${blueAllianceNum.allianceNameLong})`
    : 'Blue';

  return (
    <div
      style={{
        fontFamily: 'Roboto, sans-serif !important',
        width: '100%',
        maxWidth: '80%',
        margin: '0 auto',
        padding: '0.5rem 1rem',
        backdropFilter: 'blur(5px)',
        backgroundColor: '#000000ca',
        borderRadius: '1.5rem',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'absolute',
        bottom: '1rem',
        left: 0,
        right: 0
      }}
    >
      <L3Header
        title={`${match?.name || ''} | Field ${match?.fieldNumber || ''}`}
        leftText={redHeader}
        rightText={blueHeader}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '1rem'
        }}
      >
        <AllianceBox allianceColor='red'>
          <Space direction='vertical' style={{ flex: 1, gap: '.75rem' }}>
            {redTeams.map((team) => (
              <AllianceTeam
                key={team.teamKey}
                team={team}
                noBg
                noRankChange
                large
              />
            ))}
          </Space>
        </AllianceBox>
        <AllianceBox allianceColor='blue'>
          <Space direction='vertical' style={{ flex: 1, gap: '.75rem' }}>
            {blueTeams.map((team) => (
              <AllianceTeam
                key={team.teamKey}
                team={team}
                noBg
                noRankChange
                large
              />
            ))}
          </Space>
        </AllianceBox>
      </div>
    </div>
  );
};
