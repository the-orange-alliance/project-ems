import type {
  PlaybackDeliveryFailureReason,
  PlaybackDeliveryHealth
} from '@toa-lib/models';
import { Alert, Button, Space } from 'antd';
import { useAtomValue } from 'jotai';
import { useEffect, useState, type FC } from 'react';
import { usePlaybackDelivery } from 'src/api/playback-delivery.js';
import { graphicsApi } from 'src/api/use-graphics-data.js';
import { playbackStateForEventAtom } from 'src/stores/state/graphics.js';

const REASON_LABEL: Record<PlaybackDeliveryFailureReason, string> = {
  'too-large': 'envelope too large for the realtime ingress',
  'realtime-unreachable': 'realtime unreachable',
  'realtime-rejected': 'realtime rejected the publication',
  'retired-epoch': "this API's authority epoch was retired",
  'publish-failed': 'publish failed'
};

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Whether what the producer committed actually reached the displays.
 *
 * Persistent (not a toast): a failed or parked publication stays on screen
 * until an answer from the API says otherwise. Fed only by answers to
 * requests the producer made - every playback command's acknowledgment, the
 * one explicit read when this surface opens, and the Check / Retry buttons.
 * It installs no timer and never polls.
 *
 * The in-flight window: publication is not awaited by the command, so its
 * acknowledgment usually reports its own revision as `in-flight`. That clears
 * as soon as this page's own realtime feed receives the revision (which is
 * proof realtime broadcast it), or on the next answer from the API. If it
 * does not clear, the producer is told so and given Check delivery.
 */
export const PublicationDeliveryStatus: FC<{ eventKey: string | null }> = ({
  eventKey
}) => {
  const health = usePlaybackDelivery(eventKey);
  const feedRevision =
    useAtomValue(playbackStateForEventAtom(eventKey))?.revision ?? null;
  const [busy, setBusy] = useState<'check' | 'retry' | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    setRequestError(null);
    if (!eventKey) return;
    let current = true;
    graphicsApi.live.publicationHealth(eventKey).catch((error: unknown) => {
      if (current)
        setRequestError(
          `Could not read delivery health for ${eventKey}: ${describe(error)}`
        );
    });
    return () => {
      current = false;
    };
  }, [eventKey]);

  if (!eventKey) return null;

  const run = async (kind: 'check' | 'retry') => {
    setBusy(kind);
    setRequestError(null);
    try {
      await (kind === 'check'
        ? graphicsApi.live.publicationHealth(eventKey)
        : graphicsApi.live.retryPublication(eventKey));
    } catch (error) {
      setRequestError(
        `${kind === 'check' ? 'Check delivery' : 'Retry delivery'} for ${eventKey} failed: ${describe(error)}`
      );
    } finally {
      setBusy(null);
    }
  };

  const view = describeDelivery(eventKey, health, feedRevision);
  if (!view && !requestError) return null;

  const actions = (
    <Space direction='vertical'>
      <Button size='small' loading={busy === 'check'} onClick={() => run('check')}>
        Check delivery
      </Button>
      {view?.retry && (
        <Button
          size='small'
          danger
          loading={busy === 'retry'}
          onClick={() => run('retry')}
        >
          Retry delivery
        </Button>
      )}
    </Space>
  );

  return (
    <Alert
      type={view?.type ?? 'error'}
      showIcon
      message={view?.message ?? 'Delivery health unavailable'}
      description={
        <>
          {view?.details.map((line) => <div key={line}>{line}</div>)}
          {requestError && <div>{requestError}</div>}
        </>
      }
      action={actions}
    />
  );
};

interface DeliveryView {
  type: 'error' | 'warning' | 'info';
  message: string;
  details: string[];
  retry: boolean;
}

function describeDelivery(
  eventKey: string,
  health: PlaybackDeliveryHealth | null,
  feedRevision: number | null
): DeliveryView | null {
  if (!health) return null;
  const { failure } = health;
  switch (health.status) {
    case 'idle':
    case 'delivered':
      return null;
    case 'unconfigured':
      return {
        type: 'warning',
        message: `No realtime publisher is configured for ${eventKey}`,
        details: [
          'Playback commands are saved, but no display is updated. Configure GRAPHICS_PUBLICATION_TOKEN and GRAPHICS_REALTIME_BASE_URL on the API and restart it.'
        ],
        retry: false
      };
    case 'in-flight':
      if (
        feedRevision !== null &&
        health.pendingRevision !== null &&
        feedRevision >= health.pendingRevision
      )
        return null;
      return {
        type: 'info',
        message: `Revision ${health.pendingRevision} of ${eventKey} is being sent to displays - not yet confirmed`,
        details: [
          `Last confirmed delivery: ${health.lastDeliveredRevision === null ? 'none yet' : `revision ${health.lastDeliveredRevision}`}. ` +
            'This clears when the revision reaches this page or the API reports it delivered. If it stays, press Check delivery.'
        ],
        retry: false
      };
    case 'failing':
    case 'parked': {
      if (!failure) return null;
      const parked = health.status === 'parked';
      return {
        type: 'error',
        message: `Displays are NOT showing revision ${failure.revision} of ${eventKey} (${REASON_LABEL[failure.reason]})`,
        details: [
          parked
            ? `Delivery stopped after ${failure.attempts} attempts and will not retry on its own.`
            : `Delivery failed on attempt ${failure.attempts}${health.nextRetryAtUtc ? `; retrying automatically at ${health.nextRetryAtUtc}` : ''}.` +
              (health.pendingRevision !== null &&
              health.pendingRevision !== failure.revision
                ? ` Latest revision ${health.pendingRevision} is also waiting.`
                : ''),
          failure.message,
          failure.action
        ],
        retry: failure.reason !== 'retired-epoch'
      };
    }
  }
}
