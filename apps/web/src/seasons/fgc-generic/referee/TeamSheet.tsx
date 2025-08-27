import { FC } from 'react';
import { Row, Col, Typography, Button } from 'antd';
import {
  CardStatusUpdate,
  MatchParticipant,
  MatchSocketEvent
} from '@toa-lib/models';
import { useSocket } from 'src/api/use-socket.js';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier.js';
import { matchAtom } from 'src/stores/state/event.js';
import { useAtom } from 'jotai';
interface Props {
  station: number;
}

const TeamSheet: FC<Props> = ({ station }) => {
  const [socket] = useSocket();
  const [match, setMatch] = useAtom(matchAtom)
  const identifiers = useTeamIdentifiers();
  const participant = match?.participants?.find((p) => p.station === station);

  const setParticipant = (participant: MatchParticipant) => {
    if (match && match.participants) {
      setMatch(
        Object.assign(
          {},
          {
            ...match,
            participants: match.participants.map((p) =>
              p.station === station ? participant : p
            )
          }
        )
      );
    }
  };

  const handleCardChange = (cardStatus: number) => {
    if (participant) {
      setParticipant(Object.assign({}, { ...participant, cardStatus }));
      const updateCardPacket: CardStatusUpdate = {
        teamKey: participant.teamKey,
        cardStatus
      };
      socket?.emit(MatchSocketEvent.UPDATE_CARD_STATUS, updateCardPacket);
    }
  };

  const handleYellow = () => {
    handleCardChange(participant?.cardStatus === 1 ? 0 : 1);
  };

  const handleRed = () => {
    handleCardChange(participant?.cardStatus === 2 ? 0 : 2);
  };

  const handleWhite = () => {
    handleCardChange(participant?.cardStatus === 3 ? 0 : 3);
  };

  return (
    <Row justify="center" style={{ width: '100%' }}>
      <Col span={24} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {participant && (
          <Typography.Title level={5}>{identifiers[participant.teamKey]}</Typography.Title>
        )}
        <Row gutter={8} style={{ width: '100%' }}>
          <Col flex={1}>
            <Button
              block
              type={participant?.cardStatus === 1 ? 'primary' : 'default'}
              danger={participant?.cardStatus === 1}
              onClick={handleYellow}
              style={{ backgroundColor: participant?.cardStatus === 1 ? '#faad14' : undefined, color: participant?.cardStatus === 1 ? '#fff' : undefined }}
            >
              Yellow Card
            </Button>
          </Col>
          <Col flex={1}>
            <Button
              block
              type={participant?.cardStatus === 2 ? 'primary' : 'default'}
              danger={participant?.cardStatus === 2}
              onClick={handleRed}
              style={{ backgroundColor: participant?.cardStatus === 2 ? '#ff4d4f' : undefined, color: participant?.cardStatus === 2 ? '#fff' : undefined }}
            >
              Red Card
            </Button>
          </Col>
          <Col flex={1}>
            <Button
              block
              type={participant?.cardStatus === 3 ? 'primary' : 'default'}
              onClick={handleWhite}
              style={{ backgroundColor: participant?.cardStatus === 3 ? '#fff' : undefined, color: participant?.cardStatus === 3 ? '#000' : undefined, border: participant?.cardStatus === 3 ? '2px solid #d9d9d9' : undefined }}
            >
              White Card
            </Button>
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

export default TeamSheet;
