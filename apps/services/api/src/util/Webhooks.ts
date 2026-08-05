import { Match, WebhookDb, WebhookEvent } from '@toa-lib/models';
import fetch from 'node-fetch';
import { getDB } from '../db/EventDatabase.js';

const AbortController = globalThis.AbortController;

/**
 * Match fields that are owned by the database rather than by the client that
 * triggered the webhook. These get overlaid onto the payload before it goes
 * out; see `withPersistedFields`.
 */
const PERSISTED_FIELDS = [
  'name',
  'scheduledTime',
  'prestartTime',
  'actualStartTime',
  'cycleTime',
  'fieldNumber',
  'active',
  'uploaded'
] as const;

/**
 * Overlays the authoritative persisted values for {@link PERSISTED_FIELDS} onto
 * a client-supplied match payload.
 *
 * Webhooks are triggered by the browser, so the payload is whatever that client
 * happened to be holding — which is how a stale `prestartTime` shipped for a
 * whole season (#236). Re-reading those fields from the database fixes that.
 *
 * This deliberately *overlays* rather than replacing the payload wholesale.
 * Before scores are committed the database row is the stale one: live scores,
 * penalties, `result`, participants and details exist only in the realtime
 * room and on the client. `ALL_CLEAR` in particular fires *before* `COMMITTED`,
 * so swapping in the database row there would report a match that was just
 * played as 0-0. Timing/identity metadata comes from the database; live scoring
 * data stays with the payload.
 *
 * Falls back to the payload untouched if the match cannot be read, so a webhook
 * still goes out rather than being dropped.
 */
const withPersistedFields = async (match: Match<any>): Promise<Match<any>> => {
  try {
    const db = await getDB(match.eventKey);
    const [stored] = await db.selectAllWhere(
      'match',
      `eventKey = "${match.eventKey}" AND tournamentKey = "${match.tournamentKey}" AND id = ${match.id}`
    );
    if (!stored) return match;
    const overlay: Record<string, unknown> = {};
    for (const field of PERSISTED_FIELDS) {
      if (stored[field] !== undefined) overlay[field] = stored[field];
    }
    return { ...match, ...overlay };
  } catch (e) {
    console.error(
      `Failed to read persisted fields for webhook payload; sending client payload as-is:`,
      e
    );
    return match;
  }
};

export const EmitWebhooks = async (
  webhookEvent: WebhookEvent,
  match: Match<any>
) => {
  // Callers pass whatever is in the client's match atom, which is `null` when
  // no match is selected. Bail out loudly instead of throwing on
  // `match.fieldNumber` below and having the route swallow it silently.
  // eventKey must be non-empty specifically because `getDB` below would
  // otherwise create a stray database file named after it.
  if (!match?.eventKey || !match.tournamentKey || match.id === undefined) {
    console.error(
      `Refusing to emit ${webhookEvent} webhook: payload is not a match.`,
      match
    );
    return;
  }
  const payload = await withPersistedFields(match);

  const db = await getDB('global');
  const andClause =
    webhookEvent === WebhookEvent.SCORES_POSTED
      ? `AND subscribedEvent IN ('${WebhookEvent.SCORES_POSTED}', '${WebhookEvent.SCORES_POSTED_RED}', '${WebhookEvent.SCORES_POSTED_BLUE}', '${WebhookEvent.SCORES_POSTED_TIED}')`
      : '';
  const initialClause = webhookEvent === WebhookEvent.SCORES_POSTED ? '' : `subscribedEvent = '${webhookEvent}' AND `;
  // A webhook with no `field` set is subscribed to every field. If we can't
  // determine which field this match is on, those all-field subscribers should
  // still fire — interpolating a non-numeric fieldNumber straight into the SQL
  // would instead error out and drop the event for everyone.
  const fieldClause = Number.isFinite(payload.fieldNumber)
    ? `(field IS NULL OR field = ${payload.fieldNumber})`
    : 'field IS NULL';
  const webhooks = (await db.selectAllWhere(
    'webhooks',
    `${initialClause} enabled = 1 AND ${fieldClause} ${andClause}`
  )) as WebhookDb[];
  for (const webhook of webhooks) {
    if (webhook) {
      let winner: 'RED' | 'BLUE' | 'TIED' | null = null;
      // Calculate the winner
      if (webhookEvent === WebhookEvent.SCORES_POSTED) {
        if (payload.redScore > payload.blueScore) {
          winner = 'RED';
        } else if (payload.blueScore > payload.redScore) {
          winner = 'BLUE';
        } else {
          winner = 'TIED';
        }
      }
      // Determine if we should trigger based on winner
      const triggerIfWinner =
        (webhook.subscribedEvent === WebhookEvent.SCORES_POSTED_RED &&
          winner === 'RED') ||
        (webhook.subscribedEvent === WebhookEvent.SCORES_POSTED_BLUE &&
          winner === 'BLUE') ||
        (webhook.subscribedEvent === WebhookEvent.SCORES_POSTED_TIED &&
          winner === 'TIED');
      // for non scores posted events, always trigger
      const notScoresPosted = webhookEvent !== WebhookEvent.SCORES_POSTED;
      // for generic SCORES_POSTED event, always trigger
      const isScoresPostedGeneric = webhook.subscribedEvent === WebhookEvent.SCORES_POSTED;

      // Send the webhook
      if (triggerIfWinner || notScoresPosted || isScoresPostedGeneric) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => {
            controller.abort();
          }, 2500); // 2.5 second timeout
          await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: webhookEvent,
              payload
            }),
            signal: controller.signal
          });
          clearTimeout(timeout);
        } catch (e) {
          console.error(`Failed to send webhook to ${webhook.url}:`, e);
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          const errorTime = new Date().toISOString();
          try {
            await db.updateWhere(
              'webhooks',
              {
                lastErrorMessage: errorMessage,
                lastErrorTime: errorTime,
                errorCount: (webhook.errorCount || 0) + 1
              },
              `id = ${webhook.id}`
            );
          } catch (dbError) {
            console.error(
              `Failed to update webhook error info for ${webhook.url}:`,
              dbError
            );
          }
        }
      }
    }
  }
};
