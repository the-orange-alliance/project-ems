import { FC } from 'react';
import { Row, Col } from 'antd';
import { AllianceCard } from './alliance-card.js';
import { MatchParticipant, Team } from '@toa-lib/models';
import { useMatchControl } from '../hooks/use-match-control.js';
import { MatchInfo } from './match-info.js';
import { matchAtom } from 'src/stores/state/event.js';
import { useAtom } from 'jotai';

interface Props {
  teams?: Team[];
}

export const MatchHeader: FC<Props> = ({ teams }) => {
  const { canPrestart, canResetField } = useMatchControl();
  const [match, setMatch] = useAtom(matchAtom);
  const canEdit = canPrestart || canResetField;
  const handleParticipantChange = (participants: MatchParticipant[]) => {
    if (!match) return;
    setMatch({ ...match, participants });
  };
  return (
    <Row gutter={8} style={{ marginTop: 16, width: '100%' }}>
      <Col xs={24} sm={12} md={10}>
        <AllianceCard
          teams={teams}
          participants={match?.participants}
          alliance='red'
          disabled={!canEdit}
          handleChange={handleParticipantChange}
        />
      </Col>
      <Col xs={24} sm={12} md={4} style={{ paddingTop: 0 }}>
        <MatchInfo />
      </Col>
      <Col xs={24} sm={12} md={10}>
        <AllianceCard
          teams={teams}
          participants={match?.participants}
          alliance='blue'
          disabled={!canEdit}
          handleChange={handleParticipantChange}
        />
      </Col>
    </Row>
  );
};
