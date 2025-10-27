import { Match, WebhookDb, WebhookEvent } from '@toa-lib/models';
import fetch from 'node-fetch';
import { getDB } from '../db/EventDatabase.js';

const AbortController = globalThis.AbortController;

export const EmitWebhooks = async (
  webhookEvent: WebhookEvent,
  match: Match<any>
) => {
  const db = await getDB('global');
  const andClause =
    webhookEvent === WebhookEvent.SCORES_POSTED
      ? `AND subscribedEvent IN ('${WebhookEvent.SCORES_POSTED}', '${WebhookEvent.SCORES_POSTED_RED}', '${WebhookEvent.SCORES_POSTED_BLUE}', '${WebhookEvent.SCORES_POSTED_TIED}')`
      : '';
  const webhooks = (await db.selectAllWhere(
    'webhooks',
    `subscribedEvent = '${webhookEvent}' AND enabled = 1 AND (field IS NULL OR field = ${match.fieldNumber}) ${andClause}`
  )) as WebhookDb[];
  for (const webhook of webhooks) {
    if (webhook) {
      let winner: 'RED' | 'BLUE' | 'TIED' | null = null;
      // Calculate the winner
      if (webhookEvent === WebhookEvent.SCORES_POSTED) {
        if (match.redScore > match.blueScore) {
          winner = 'RED';
        } else if (match.blueScore > match.redScore) {
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
              payload: match
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
                lastError: errorMessage,
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
