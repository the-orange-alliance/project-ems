import { apiFetcher, clientFetcher } from '@toa-lib/client';
import useSWR from 'swr';
import { Webhook, WebhookEvent } from '@toa-lib/models';

export const useWebhooks = () =>
  useSWR('webhooks', (url) => clientFetcher<Webhook[]>(url, 'GET'), {
    revalidateOnFocus: false
  });

export const upsertWebhook = async (webhook: Webhook): Promise<void> =>
  apiFetcher('webhooks', 'PUT', webhook);

export const deleteWebhook = async (id: number): Promise<void> =>
  apiFetcher(`webhooks/${id}`, 'DELETE');

export const emitWebhook = async (
  event: WebhookEvent,
  payload: any
): Promise<void> => {
  try {
    await apiFetcher('webhooks/send', 'POST', { event, payload });
  } catch (e) {
    console.error('Failed to emit webhook:', event, payload, e);
  }
};

export interface TestWebhookResult {
  success: boolean;
  status?: number;
  statusText?: string;
  error?: string;
}

/**
 * Sends one best-effort sample payload straight to `url` (no saved webhook
 * row required) so the Webhooks settings tab can offer a "Test" action.
 */
export const testWebhook = async (
  url: string,
  event: WebhookEvent
): Promise<TestWebhookResult> => {
  try {
    return await apiFetcher('webhooks/test', 'POST', { url, event });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
};
