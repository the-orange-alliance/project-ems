import { Card, Row, Col, Typography } from 'antd';
import {
  Alliance,
  BLUE_STATION,
  MatchParticipant,
  Team
} from '@toa-lib/models';
import { FC } from 'react';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team.js';
import { FGCParticipantCardStatus } from './participant-card-status.js';
import CheckboxStatus from './checkbox-status.js';

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
  const allianceParticipants = participants
    ? participants.filter((p) =>
        alliance === 'red'
          ? p.station < BLUE_STATION
          : p.station >= BLUE_STATION
      )
    : [];
  const changeParticipant = (station: number, teamKey: number) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, teamKey } : p
    );
    handleChange(newParticipants);
  };
  const changeCardStatus = (station: number, cardStatus: number) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, cardStatus } : p
    );
    handleChange(newParticipants);
  };
  const changeNoShow = (station: number, noShow: boolean) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, noShow: Number(noShow) } : p
    );
    handleChange(newParticipants);
  };
  const changeDisqualified = (station: number, disqualified: boolean) => {
    if (!participants || !handleChange) return;
    const newParticipants = participants.map((p) =>
      p.station === station ? { ...p, disqualified: Number(disqualified) } : p
    );
    handleChange(newParticipants);
  };

  return (
    <Card
      className={alliance === 'red' ? 'red-bg-imp' : 'blue-bg-imp'}
      style={{ paddingBottom: 8, minHeight: '100%' }}
    >
      <Row style={{ marginBottom: 8 }}>
        <Col md={4} style={{ paddingTop: 4 }}>
          <Typography.Text
            style={{ width: '100%', display: 'block', textAlign: 'center' }}
          >
            Team
          </Typography.Text>
        </Col>
        <Col md={4} style={{ paddingTop: 4 }}>
          <Typography.Text
            style={{ width: '100%', display: 'block', textAlign: 'center' }}
          >
            Card Status
          </Typography.Text>
        </Col>
        <Col md={2} style={{ paddingTop: 4 }}>
          <Typography.Text
            style={{ width: '100%', display: 'block', textAlign: 'center' }}
          >
            No Show
          </Typography.Text>
        </Col>
        <Col md={2} style={{ paddingTop: 4 }}>
          <Typography.Text
            style={{ width: '100%', display: 'block', textAlign: 'center' }}
          >
            DQ
          </Typography.Text>
        </Col>
      </Row>
      {allianceParticipants.map((p) => {
        const handleTeamChange = (team: Team | null) => {
          if (!team) return;
          changeParticipant(p.station, team.teamKey);
        };
        const handleCardChange = (status: number) => {
          changeCardStatus(p.station, status);
        };
        const handleNoShowChange = (value: boolean) => {
          changeNoShow(p.station, value);
        };
        const handleDisqualifiedChange = (value: boolean) => {
          changeDisqualified(p.station, value);
        };
        return (
          <Row
            key={`${p.teamKey}-${p.station}`}
            gutter={8}
            style={{ padding: '4px 12px' }}
            align='middle'
          >
            <Col md={4}>
              <AutocompleteTeam
                teams={teams}
                teamKey={p.teamKey}
                disabled={disabled}
                onChange={handleTeamChange}
              />
            </Col>
            <Col md={4}>
              <FGCParticipantCardStatus
                cardStatus={p.cardStatus}
                disabled={disabled}
                onChange={handleCardChange}
              />
            </Col>
            <Col md={2}>
              <CheckboxStatus
                value={Boolean(p.noShow)}
                disabled={disabled}
                onChange={handleNoShowChange}
              />
            </Col>
            <Col md={2}>
              <CheckboxStatus
                value={Boolean(p.disqualified)}
                disabled={disabled}
                onChange={handleDisqualifiedChange}
              />
            </Col>
          </Row>
        );
      })}
    </Card>
  );
};
