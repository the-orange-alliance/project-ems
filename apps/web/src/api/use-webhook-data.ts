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
