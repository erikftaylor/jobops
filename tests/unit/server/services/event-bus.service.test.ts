import { describe, it, expect, beforeEach } from 'vitest';
import { EventBusService } from '../../../../src/server/services/event-bus.service';

describe('EventBusService', () => {
  let eventBus: EventBusService;

  beforeEach(() => {
    eventBus = new EventBusService();
  });

  it('should subscribe and emit events', () => {
    const events: any[] = [];
    eventBus.subscribe('change:accepted', (data) => {
      events.push(data);
    });

    eventBus.emit('change:accepted', { changeId: 'change-123', accepted: true });

    expect(events).toHaveLength(1);
    expect(events[0].changeId).toBe('change-123');
  });

  it('should support multiple subscribers', () => {
    const events1: any[] = [];
    const events2: any[] = [];

    eventBus.subscribe('score:updated', (data) => events1.push(data));
    eventBus.subscribe('score:updated', (data) => events2.push(data));

    eventBus.emit('score:updated', { score: 85 });

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it('should allow unsubscribing', () => {
    const events: any[] = [];
    const unsubscribe = eventBus.subscribe('test:event', (data) => events.push(data));

    eventBus.emit('test:event', { value: 1 });
    unsubscribe();
    eventBus.emit('test:event', { value: 2 });

    expect(events).toHaveLength(1);
  });

  it('should handle async listeners', async () => {
    const results: any[] = [];
    eventBus.subscribe('async:event', async (data) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push(data);
    });

    eventBus.emit('async:event', { async: true });
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(results).toHaveLength(1);
  });

  it('should clear all subscribers for an event', () => {
    const events: any[] = [];
    eventBus.subscribe('clear:test', (data) => events.push(data));
    eventBus.subscribe('clear:test', (data) => events.push(data));

    eventBus.emit('clear:test', {});
    expect(events).toHaveLength(2);

    eventBus.clear('clear:test');
    eventBus.emit('clear:test', {});
    expect(events).toHaveLength(2);
  });
});
