import { Card, Typography } from 'antd';
import {
  Alliance,
  BLUE_STATION,
  MatchParticipant,
  Team
} from '@toa-lib/models';
import { FC, Fragment } from 'react';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team.js';
import { FGCParticipantCardStatus } from './participant-card-status.js';
import CheckboxStatus from './checkbox-status.js';
import { ALLIANCES, allianceTint } from './alliances.js';

// Station | Team | Card | No Show | DQ
const GRID_COLUMNS = '16px minmax(0, 1fr) 112px 56px 32px';

interface Props {
  teams?: Team[];
  alliance: Alliance;
  disabled?: boolean;
  participants?: MatchParticipant[];
  handleChange?: (participants: MatchParticipant[]) => void;
}

export const AllianceCard: FC<Props> = ({
  teams,
  alliance,
  disabled,
  participants,
  handleChange
}) => {
  const { title, color } = ALLIANCES[alliance];
  const tint = allianceTint(alliance);
  const allianceParticipants = (participants ?? []).filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );

  const updateParticipant = (
    station: number,
    changes: Partial<MatchParticipant>
  ) => {
    if (!participants || !handleChange) return;
    handleChange(
      participants.map((p) =>
        p.station === station ? { ...p, ...changes } : p
      )
    );
  };

  return (
    <Card
      style={{
        height: '100%',
        borderTop: `4px solid ${color}`,
        // A tint layered over the card background reads well in both themes.
        backgroundImage: `linear-gradient(${tint}, ${tint})`
      }}
      styles={{ body: { padding: 12 } }}
    >
      <Typography.Text
        strong
        style={{ color, display: 'block', marginBottom: 8 }}
      >
        {title}
      </Typography.Text>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          alignItems: 'center',
          columnGap: 8,
          rowGap: 6
        }}
      >
        <HeaderCell />
        <HeaderCell label='Team' align='left' />
        <HeaderCell label='Card' />
        <HeaderCell label='No Show' />
        <HeaderCell label='DQ' />
        {allianceParticipants.map((p) => (
          <Fragment key={p.station}>
            <Typography.Text type='secondary'>{p.station % 10}</Typography.Text>
            <AutocompleteTeam
              teams={teams}
              teamKey={p.teamKey}
              disabled={disabled}
              onChange={(team) =>
                team && updateParticipant(p.station, { teamKey: team.teamKey })
              }
            />
            <FGCParticipantCardStatus
              cardStatus={p.cardStatus}
              disabled={disabled}
              onChange={(cardStatus) =>
                updateParticipant(p.station, { cardStatus })
              }
            />
            <CheckboxStatus
              value={Boolean(p.noShow)}
              disabled={disabled}
              onChange={(noShow) =>
                updateParticipant(p.station, { noShow: Number(noShow) })
              }
            />
            <CheckboxStatus
              value={Boolean(p.disqualified)}
              disabled={disabled}
              onChange={(disqualified) =>
                updateParticipant(p.station, {
                  disqualified: Number(disqualified)
                })
              }
            />
          </Fragment>
        ))}
      </div>
    </Card>
  );
};

const HeaderCell: FC<{ label?: string; align?: 'left' | 'center' }> = ({
  label,
  align = 'center'
}) => (
  <Typography.Text type='secondary' style={{ fontSize: 12, textAlign: align }}>
    {label}
  </Typography.Text>
);
