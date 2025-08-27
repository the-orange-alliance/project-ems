import { FC, useState } from 'react';
import { RefereeScoreSheetProps } from '@seasons/index.js';
import { useSocket } from 'src/api/use-socket.js';
import { useAtom, useAtomValue } from 'jotai';
import { matchAtom, matchesAtom, matchIdAtom } from 'src/stores/state/event.js';
import {
  Match,
  MatchSocketEvent,
  ItemUpdate,
  NumberAdjustment,
  MatchDetailBase,
  Alliance,
  MatchParticipant
} from '@toa-lib/models';
import { Card, Typography, Tabs, Row, Col } from 'antd';
import { ConnectionChip } from 'src/components/util/connection-chip.js';
import { MatchChip } from 'src/components/util/match-chip.js';
import TeamSheet from 'src/seasons/fgc-generic/referee/TeamSheet.js';
import PenaltySheet from 'src/seasons/fgc-generic/referee/PenaltySheet.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';

// forever hail the generic types

export interface TeleOpProps<DetailsType extends MatchDetailBase> {
  alliance: Alliance;
  participants: MatchParticipant[] | undefined;
  onMatchDetailsAdjustment: <K extends keyof DetailsType>(
    detailsKey: K,
    adjustment: number
  ) => void;
  onMatchDetailsUpdate: <K extends keyof DetailsType>(
    detailsKey: K,
    value: DetailsType[K]
  ) => void;
}

interface GenericScoreSheetProps<DetailsType extends MatchDetailBase>
  extends RefereeScoreSheetProps {
  TeleopScoreSheet: FC<TeleOpProps<DetailsType>>;
}

const GenericScoreSheet = <DetailsType extends MatchDetailBase>({
  alliance,
  TeleopScoreSheet
}: GenericScoreSheetProps<DetailsType>) => {
  const [socket] = useSocket();
  const [match, setMatch] = useAtom(matchAtom);

  const [tabIndex, setTabIndex] = useState(0);

  const participants = match?.participants
    ?.filter((p) => (alliance === 'red' ? p.station < 20 : p.station >= 20))
    .slice(0, 3);

  const handleChange = (key: string) => {
    setTabIndex(Number(key));
  };

  const handleMatchItemUpdate = <K extends keyof Match<DetailsType>>(
    key: K,
    value: Match<DetailsType>[K]
  ) => {
    const updatePacket: ItemUpdate = { key, value };
    socket?.emit(MatchSocketEvent.MATCH_UPDATE_ITEM, updatePacket);

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match) {
      const newMatch = Object.assign({}, { ...match, [key]: value });
      setMatch(newMatch);
    }
  };

  const handleMatchDetailsUpdate = <K extends keyof DetailsType>(
    detailsKey: K,
    value: DetailsType[K]
  ) => {
    const updatePacket: ItemUpdate = { key: String(detailsKey), value };
    socket?.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, updatePacket);
    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        { ...match.details, [detailsKey]: value }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  const handleMatchDetailsAdjustment = <K extends keyof DetailsType>(
    detailsKey: K,
    adjustment: number
  ) => {
    const adjustmentPacket: NumberAdjustment = {
      key: String(detailsKey),
      adjustment
    };
    socket?.emit(
      MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
      adjustmentPacket
    );
    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        {
          ...match.details,
          [detailsKey]: (match.details[detailsKey] as number) + adjustment
        }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  return (
    <Card
      style={{
        border: 'thick solid',
        borderColor: alliance === 'red' ? '#de1f1f' : '#1f85de',
        width: '100%',
        padding: 16
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 16
        }}
      >
        <Typography.Title level={4} style={{ textAlign: 'center', margin: 0 }}>
          {alliance === 'red' ? 'Red' : 'Blue'} Alliance
        </Typography.Title>
        <Row
          justify='center'
          align='middle'
          gutter={8}
          style={{ marginBottom: 8 }}
        >
          <Col>
            <ConnectionChip />
          </Col>
          <Col>
            <MatchChip match={match} />
          </Col>
        </Row>
        <Tabs
          activeKey={String(tabIndex)}
          onChange={handleChange}
          type='card'
          items={[
            {
              key: '0',
              label: 'TeleOp',
              children: (
                <TeleopScoreSheet
                  alliance={alliance}
                  participants={participants}
                  onMatchDetailsAdjustment={handleMatchDetailsAdjustment}
                  onMatchDetailsUpdate={handleMatchDetailsUpdate}
                />
              )
            },
            {
              key: '1',
              label: 'Cards/Fouls',
              children: (
                <>
                  {participants?.map((p) => (
                    <TeamSheet
                      key={`${p.eventKey}-${p.tournamentKey}-${p.station}`}
                      station={p.station}
                    />
                  ))}
                  <PenaltySheet<DetailsType>
                    alliance={alliance}
                    onMatchItemUpdate={handleMatchItemUpdate}
                  />
                </>
              )
            }
          ]}
        />
      </div>
    </Card>
  );
};

export default GenericScoreSheet;
