type AnyCb<T = any> = (v: T) => void;

export interface EventBus {
  once: (key: string, callback: AnyCb, messageKey?: string) => void;
  on: (key: string, callback: AnyCb, messageKey?: string) => void;
  off: (key: string, callback: AnyCb, messageKey?: string) => void;
  eventListeners: Map<string, Map<string, Set<AnyCb<any>>>>;
  lastEventPayload: Map<string, Map<string, any>>;
}

const EMPTY_MESSAGE_KEY = '__all__';
const eventListeners = new Map<string, Map<string, Set<AnyCb<any>>>>();
const lastEventPayload = new Map<string, Map<string, any>>();

function getListenersForKey(key: string, messageKey?: string) {
  const byMessage =
    eventListeners.get(key) ?? new Map<string, Set<AnyCb<any>>>();
  eventListeners.set(key, byMessage);
  const storeKey = messageKey ?? EMPTY_MESSAGE_KEY;
  const listeners = byMessage.get(storeKey) ?? new Set<AnyCb<any>>();
  byMessage.set(storeKey, listeners);
  return listeners;
}

export const eventBus: EventBus = {
  on(key, callback, messageKey) {
    const listeners = getListenersForKey(key, messageKey);
    listeners.add(callback);

    const payloads = lastEventPayload.get(key);
    if (!payloads) return;

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
  },
  once(key, callback, messageKey) {
    const wrapper = (data: any) => {
      callback(data);
      this.off(key, wrapper, messageKey);
    };
    this.on(key, wrapper, messageKey);
  },
  off(key, callback, messageKey) {
    const listeners = eventListeners
      .get(key)
      ?.get(messageKey ?? EMPTY_MESSAGE_KEY);
    listeners?.delete(callback);
    if (listeners?.size === 0) {
      eventListeners.get(key)?.delete(messageKey ?? EMPTY_MESSAGE_KEY);
    }
  },
  eventListeners,
  lastEventPayload
};
