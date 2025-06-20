import { Row, Col, Typography } from 'antd';
import { Match, MatchParticipant, Team } from '@toa-lib/models';
import { FC } from 'react';
import {
  FGCParticipantCardStatus,
  ParticipantCardStatus
} from 'src/apps/scorekeeper/match-header/participant-card-status.js';
import { AutocompleteTeam } from 'src/components/dropdowns/autocomplete-team.js';
import { replaceInArray } from 'src/stores/array-utils.js';

interface Props {
  match: Match<any>;
  teams?: Team[];
  onUpdate: (match: Match<any>) => void;
}

export const MatchParticipantTab: FC<Props> = ({ match, teams, onUpdate }) => {
  const redAlliance = match.participants?.filter((p) => p.station < 20);
  const blueAlliance = match.participants?.filter((p) => p.station >= 20);
  const handleUpdate = (teamKey: number, p: MatchParticipant) => {
    if (!match || !match.participants) return;
    const participants = replaceInArray(
      match.participants,
      'station',
      p.station,
      { ...p, teamKey }
    );
    onUpdate({ ...match, participants });
  };
  return (
    <>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Typography.Text strong>Red Alliance</Typography.Text>
        </Col>
        {redAlliance?.map((p) => {
          const changeTeam = (t: Team | null) => {
            if (!t) return;
            handleUpdate(t.teamKey, p);
          };
          const changeCard = (status: number) => {
            handleUpdate(p.teamKey, { ...p, cardStatus: status });
          };
          return (
            <>
              <Col xs={24} sm={12} key={`red-team-${p.station}`}>
                <AutocompleteTeam
                  teamKey={p.teamKey}
                  teams={teams}
                  onChange={changeTeam}
                />
              </Col>
              <Col xs={24} sm={12} key={`red-card-${p.station}`}>
                {match.eventKey.startsWith('FGC') ? (
                  <FGCParticipantCardStatus
                    cardStatus={p.cardStatus}
                    onChange={changeCard}
                  />
                ) : (
                  <ParticipantCardStatus
                    cardStatus={p.cardStatus}
                    onChange={changeCard}
                  />
                )}
              </Col>
            </>
          );
        })}
        <Col span={24} style={{ marginTop: 16 }}>
          <Typography.Text strong>Blue Alliance</Typography.Text>
        </Col>
        {blueAlliance?.map((p) => {
          const changeTeam = (t: Team | null) => {
            if (!t) return;
            handleUpdate(t.teamKey, p);
          };
          const changeCard = (status: number) => {
            handleUpdate(p.teamKey, { ...p, cardStatus: status });
          };
          return (
            <>
              <Col xs={24} sm={12} key={`blue-team-${p.station}`}>
                <AutocompleteTeam
                  teamKey={p.teamKey}
                  teams={teams}
                  onChange={changeTeam}
                />
              </Col>
              <Col xs={24} sm={12} key={`blue-card-${p.station}`}>
                {match.eventKey.startsWith('FGC') ? (
                  <FGCParticipantCardStatus
                    cardStatus={p.cardStatus}
                    onChange={changeCard}
                  />
                ) : (
                  <ParticipantCardStatus
                    cardStatus={p.cardStatus}
                    onChange={changeCard}
                  />
                )}
              </Col>
            </>
          );
        })}
      </Row>
    </>
  );
};
