type EventListener<T = any> = (data: T) => void | Promise<void>;
type Unsubscribe = () => void;

export class EventBusService {
  private listeners: Map<string, Set<EventListener>> = new Map();

  subscribe<T = any>(eventName: string, listener: EventListener<T>): Unsubscribe {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName)!.add(listener);

    return () => {
      this.listeners.get(eventName)?.delete(listener);
    };
  }

  emit<T = any>(eventName: string, data: T): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return;

    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  clear(eventName: string): void {
    this.listeners.delete(eventName);
  }

  clearAll(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBusService();

// Event type definitions
export const WorkspaceEvents = {
  SCORE_CALCULATED: 'workspace:score:calculated',
  SCORE_UPDATED: 'workspace:score:updated',
  KEYWORDS_ANALYZED: 'workspace:keywords:analyzed',
  KEYWORDS_UPDATED: 'workspace:keywords:updated',
  CHANGE_ACCEPTED: 'workspace:change:accepted',
  CHANGE_REJECTED: 'workspace:change:rejected',
  ARTIFACT_GENERATED: 'workspace:artifact:generated',
} as const;
