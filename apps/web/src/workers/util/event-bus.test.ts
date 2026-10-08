import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from './event-bus.js';

describe('eventBus replay', () => {
  beforeEach(() => {
    eventBus.lastEventPayload.clear();
    eventBus.lastEventPayload.set(
      'match:start',
      new Map([['__all__', 'start']])
    );
  });

  it('marks the last event as replayed for a new listener', () => {
    const listener = vi.fn();
    eventBus.on('match:start', listener);
    expect(listener).toHaveBeenCalledWith('start', { replayed: true });
  });

  it('marks it as replayed for a one-time listener too', () => {
    const listener = vi.fn();
    eventBus.once('match:start', listener);
    expect(listener).toHaveBeenCalledWith('start', { replayed: true });
  });

  it('has nothing to replay for an event it has not seen', () => {
    const listener = vi.fn();
    eventBus.on('match:end', listener);
    expect(listener).not.toHaveBeenCalled();
  });
});
