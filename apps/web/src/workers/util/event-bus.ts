type AnyCb<T = any> = (v: T) => void;

export interface EventBus {
  once: (key: string, callback: AnyCb) => void;
  on: (key: string, callback: AnyCb) => void;
  off: (key: string, callback: AnyCb) => void;
  eventListeners: Map<string, Set<AnyCb<any>>>;
  lastEventPayload: Map<string, any>;
}

const eventListeners = new Map<string, Set<AnyCb<any>>>();
const lastEventPayload = new Map<string, any>();

export const eventBus: EventBus = {
  on(key, callback) {
    if (!eventListeners.has(key)) {
      eventListeners.set(key, new Set());
    }
    eventListeners.get(key)!.add(callback);

    if (lastEventPayload.has(key)) {
      callback(lastEventPayload.get(key));
    }
  },
  once(key, callback) {
    const wrapper = (data: any) => {
      callback(data);
      eventListeners.get(key)?.delete(wrapper);
    };
    this.on(key, wrapper);
  },
  off(key, callback) {
    eventListeners.get(key)?.delete(callback);
  },
  eventListeners,
  lastEventPayload
};
