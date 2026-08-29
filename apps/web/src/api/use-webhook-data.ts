import { ApiResponseError, Webhook, WebhookEvent } from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

export const webhooksApi = {
  get: {
    webhooks: (): Promise<Webhook[] | null> =>
      localClient.get<Webhook[]>('/webhooks')
  },
  update: {
    webhook: async (webhook: Webhook): Promise<void> => {
      await localClient.put<void>('/webhooks', { body: webhook });
    }
  },
  delete: {
    webhook: async (id: number): Promise<void> => {
      await localClient.delete<void>(`/webhooks/${id}`);
    }
  },
  create: {
    emit: async (event: WebhookEvent, payload: any): Promise<void> => {
      await localClient.post<void>('/webhooks/send', {
        body: { event, payload }
      });
    }
  }
};

export const useWebhooks = (): SWRResponse<Webhook[], ApiResponseError> =>
  useSWR<Webhook[], ApiResponseError>(
    '/webhooks',
    () => webhooksApi.get.webhooks().then((res) => res ?? []),
    {
      revalidateOnFocus: false
    }
  );
