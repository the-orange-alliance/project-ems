import { GlobalObjectivesStream } from './components/global-objectives.js';
import { FC } from 'node_modules/@types/react/index.js';
import { DisplayProps } from '../../displays.js';
import { AllianceSheetStream } from './components/alliance-sheet.js';
import L3Header from './components/l3-header.js';
import { useAllianceMember } from 'src/api/use-alliance-data.js';

export const MatchResultsStream: FC<DisplayProps> = ({
  match,
  ranks,
  teams
}) => {
  const redAllianceNum = useAllianceMember(
    match?.eventKey || '',
    match?.tournamentKey || '',
    match?.participants?.filter((t) => t.station < 20)[0]?.teamKey || 0
  );

  const blueAllianceNum = useAllianceMember(
    match?.eventKey || '',
    match?.tournamentKey || '',
    match?.participants?.filter((t) => t.station >= 20)[0]?.teamKey || 0
  );

  const redHeader = redAllianceNum
    ? `Red (${redAllianceNum.allianceNameLong})`
    : 'Red';
  const blueHeader = blueAllianceNum
    ? `Blue (${blueAllianceNum.allianceNameLong})`
    : 'Blue';

    console.log(blueAllianceNum, redAllianceNum);

  return (
    <div
      style={{
        width: '100%',
        fontFamily: 'Roboto, sans-serif !important',
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
      {/* Top Header Section */}
      <L3Header
        title={`Results | ${match?.name || ''}`}
        leftText={redHeader}
        rightText={blueHeader}
      />

      {/* Main Content Sections */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '1rem'
        }}
      >
        <AllianceSheetStream
          allianceColor='red'
          match={match}
          teams={teams}
          isPlayoffs={!!redAllianceNum}
        />

        <GlobalObjectivesStream match={match} />

        <AllianceSheetStream
          allianceColor='blue'
          match={match}
          teams={teams}
          isPlayoffs={!!blueAllianceNum}
        />
      </div>
    </div>
  );
};

export default MatchResultsStream;
