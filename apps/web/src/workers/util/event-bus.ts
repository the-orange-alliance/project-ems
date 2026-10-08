type AnyCb<T = any> = (v: T) => void;

export interface EventBus {
  once: (
    key: string,
    callback: AnyCb,
    messageKey?: string,
    replay?: boolean
  ) => string;
  on: (
    key: string,
    callback: AnyCb,
    messageKey?: string,
    replay?: boolean
  ) => string;
  off: (key: string, listenerId: string, messageKey?: string) => void;

  eventListeners: Map<string, Map<string, Map<string, AnyCb<any>>>>;

  lastEventPayload: Map<string, Map<string, any>>;
}

const EMPTY_MESSAGE_KEY = '__all__';

const eventListeners = new Map<string, Map<string, Map<string, AnyCb<any>>>>();

const lastEventPayload = new Map<string, Map<string, any>>();

let nextListenerId = 0;

function createListenerId(): string {
  return `${++nextListenerId}`;
}

function getListenersForKey(
  key: string,
  messageKey?: string
): Map<string, AnyCb<any>> {
  const byMessage =
    eventListeners.get(key) ?? new Map<string, Map<string, AnyCb<any>>>();

  eventListeners.set(key, byMessage);

  const storeKey = messageKey ?? EMPTY_MESSAGE_KEY;

  const listeners = byMessage.get(storeKey) ?? new Map<string, AnyCb<any>>();

  byMessage.set(storeKey, listeners);

  return listeners;
}

function replayLastEvent(key: string, callback: AnyCb, messageKey?: string) {
  const payloads = lastEventPayload.get(key);
  console.log(
    `Replaying last event for key: ${key}, messageKey: ${messageKey}`,
    payloads
  );
  if (!payloads) {
    return;
  }

  if (messageKey) {
    const payload = payloads.get(messageKey);

    if (payload !== undefined) {
      callback(payload);
    }

    return;
  }

  for (const payload of payloads.values()) {
    callback(payload);
  }
}

export const eventBus: EventBus = {
  on(key, callback, messageKey, replay) {
    const listeners = getListenersForKey(key, messageKey);
    const listenerId = createListenerId();

    listeners.set(listenerId, callback);

    if (replay) {
      replayLastEvent(key, callback, messageKey);
    }

    return listenerId;
  },

  once(key, callback, messageKey, replay) {
    const listeners = getListenersForKey(key, messageKey);
    const listenerId = createListenerId();

    const wrapper = (data: any) => {
      callback(data);
      eventBus.off(key, listenerId, messageKey);
    };

    listeners.set(listenerId, wrapper);

    if (replay) {
      replayLastEvent(key, wrapper, messageKey);
    }

    return listenerId;
  },

  off(key, listenerId, messageKey) {
    const storeKey = messageKey ?? EMPTY_MESSAGE_KEY;

    const byMessage = eventListeners.get(key);
    const listeners = byMessage?.get(storeKey);

    if (!listeners) {
      return;
    }

    listeners.delete(listenerId);

    if (listeners.size === 0) {
      byMessage?.delete(storeKey);
    }

    if (byMessage?.size === 0) {
      eventListeners.delete(key);
    }
  },

  eventListeners,
  lastEventPayload
};
