import React from 'react';
import { MatchParticipant, Ranking } from '@toa-lib/models';
import { CountryFlag } from './country-flag.js';
import { CardStatus } from './card-status.js';
import { Space, Typography } from 'antd';
import { useAtomValue } from 'jotai';
import { matchOccurringRanksAtom } from 'src/stores/state/event.js';

interface AllianceTeamProps {
  team: MatchParticipant;
  large?: boolean;
  noBg?: boolean;
  noRankChange?: boolean;
}

const calcRankChange = (ranks: Ranking[], team: MatchParticipant) => {
  const me = ranks.find((r) => r.teamKey === team.teamKey);
  const rankChange = me ? me.rankChange : null;
  const up = rankChange && rankChange < 0;
  const down = rankChange && rankChange > 0;
  return { currentRank: me, rankChange, up, down };
};

const AllianceTeam: React.FC<AllianceTeamProps> = ({
  team,
  large = false,
  noBg = false,
  noRankChange = false
}) => {
  const ranks: Ranking[] = useAtomValue(matchOccurringRanksAtom);

  const { currentRank, up, down } = calcRankChange(ranks, team);

  // TODO: Update!

  const nameFontSize = large ? '1.7rem' : '1.125rem';
  const flagSize = large ? '3rem' : '1rem';
  const rankFontSize = large ? '1.75rem' : '1.25rem';
  const iconFontSize = large ? '1.75rem' : '1.25rem';

  return (
    <div
      style={{
        backgroundColor: !noBg ? '#1f2937ca' : undefined,
        borderRadius: !noBg ? '0.75rem' : undefined,
        padding: !noBg ? '0.75rem' : undefined,
        boxShadow: !noBg ? '0 4px 6px -1px rgba(0, 0, 0, 0.25)' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <CountryFlag size={flagSize} cc={team.team?.countryCode ?? ''} />
        <span
          style={{ fontWeight: 'bold', fontSize: nameFontSize, color: 'white' }}
        >
          {team.team?.teamNameShort}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          height: '2rem',
          marginRight: '5px',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <CardStatus cardStatus={team.cardStatus} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{ fontWeight: 'bold', fontSize: rankFontSize, color: 'white' }}
        >
          #{currentRank ? currentRank.rank : '-'}
        </span>
        {!noRankChange && up ? (
          <span style={{ color: '#16a34a', fontSize: iconFontSize }}>▲</span>
        ) : null}
        {!noRankChange && down ? (
          <span style={{ color: '#dc2626', fontSize: iconFontSize }}>▼</span>
        ) : null}
        {!noRankChange && !up && !down ? (
          <span style={{ color: '#9ca3af', fontSize: iconFontSize }}>━</span>
        ) : null}
      </div>
    </div>
  );
};

export const AllianceTeamStream: React.FC<AllianceTeamProps> = ({ team }) => {
  const ranks: Ranking[] = useAtomValue(matchOccurringRanksAtom);
  const { currentRank, up, down } = calcRankChange(ranks, team);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.2rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
        <Typography.Text
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            textShadow: '0 0 5px rgba(0,0,0,0.8)'
          }}
        >
          #{currentRank ? currentRank.rank : '-'}
        </Typography.Text>
        {up ? (
          <span style={{ color: '#16a34a', fontSize: '1.25rem' }}>▲</span>
        ) : null}
        {down ? (
          <span style={{ color: '#dc2626', fontSize: '1.25rem' }}>▼</span>
        ) : null}
        {!up && !down ? (
          <span style={{ color: '#9ca3af', fontSize: '1.25rem' }}>━</span>
        ) : null}
      </div>

      <CountryFlag size={'2.5rem'} cc={team.team?.countryCode ?? ''} />

      <Space direction='horizontal' align='center'>
        {!!team.cardStatus && (
          <div style={{ width: '1rem', height: '1rem' }}>
            <CardStatus cardStatus={team.cardStatus} />
          </div>
        )}
        <Typography.Text
          style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}
        >
          {team.team
            ? team.team?.country.length > 0
              ? team.team?.country
              : team.team?.countryCode
            : null}
        </Typography.Text>
      </Space>
    </div>
  );
};

export default AllianceTeam;
