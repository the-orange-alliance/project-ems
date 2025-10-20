import { Match, WebhookDb, WebhookEvent } from '@toa-lib/models';
import fetch from 'node-fetch';
import { getDB } from '../db/EventDatabase.js';

export const EmitWebhooks = async (webhookEvent: WebhookEvent, match: Match<any>) => {
  const db = await getDB('global');
  const webhooks = (await db.selectAllWhere(
    'webhooks',
    `subscribedEvent = '${webhookEvent}' AND enabled = 1`
  )) as WebhookDb[];
  for (const webhook of webhooks) {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: webhookEvent,
          payload: match
        })
      });
    } catch (e) {
      console.error(`Failed to send prestart webhook to ${webhook.url}:`, e);
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
};
