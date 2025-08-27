import { ItemUpdate, Match, MatchSocketEvent } from '@toa-lib/models';
import { Row, Col, Divider } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import { FC, useCallback } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';
import { matchAtom } from 'src/stores/state/event.js';
import { useMatchControl } from '../hooks/use-match-control.js';
import { useAtomCallback } from 'jotai/utils';

export const ScorekeeperDetails: FC = () => {
  const match = useAtomValue(matchAtom);
  const seasonComponents = useSeasonComponents();
  const { canEditDetails } = useMatchControl();
  const [socket] = useSocket();

  const handleMatchDetailsUpdate = useAtomCallback(
    useCallback(
      (get, set, detailsKey: string, value: any) => {
        const updatePacket: ItemUpdate = { key: String(detailsKey), value };

        const isMatchLevel = detailsKey.endsWith('Pen');
        const event = isMatchLevel
          ? MatchSocketEvent.MATCH_UPDATE_ITEM
          : MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM;

        socket?.emit(event, updatePacket);
        if (match?.details) {
          if (isMatchLevel) {
            set(matchAtom, { ...match, [detailsKey]: value });
          } else {
            set(matchAtom, {
              ...match,
              details: { ...match.details, [detailsKey]: value }
            });
          }
        }
      },
      [match, socket]
    )
  );

  return seasonComponents && match ? (
    <Row gutter={[24, 24]}>
      {seasonComponents.CustomBreakdown ? (
        <>
          <Col xs={24}>
            <seasonComponents.CustomBreakdown
              match={match}
              disabled={!canEditDetails}
              handleUpdates={handleMatchDetailsUpdate}
            />
          </Col>
          <Divider style={{ width: '100%' }}>Regional Alliances</Divider>
        </>
      ) : null}
      {seasonComponents.RedScoreBreakdown ? (
        <Col xs={24} sm={12}>
          <seasonComponents.RedScoreBreakdown
            match={match}
            disabled={!canEditDetails}
            handleUpdates={handleMatchDetailsUpdate}
          />
        </Col>
      ) : null}
      {seasonComponents.BlueScoreBreakdown ? (
        <Col xs={24} sm={12}>
          <seasonComponents.BlueScoreBreakdown
            match={match}
            disabled={!canEditDetails}
            handleUpdates={handleMatchDetailsUpdate}
          />
        </Col>
      ) : null}
    </Row>
  ) : (
    'Please select a valid match!'
  );
};
