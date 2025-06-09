// Event Bus Service - Unified event system for all stream events
import { EventEmitter } from 'events';

// Unified event interface for all stream events
export interface StreamEvent {
  type: 'chat' | 'subscription' | 'resub' | 'subgift' | 'cheer' | 'hosted' | 'raided';
  platform: string;
  channel: string;
  user: string;
  message?: string;
  amount?: number; // cheer bits, sub tier, raid viewers
  data?: any; // event-specific data
  tags?: any; // platform tags
  time: string;
}

// Legacy chat event interface for backward compatibility
export interface ChatMessageEvent {
  platform: string;
  channel: string;
  user: string;
  message: string;
  tags?: any;
  time: string;
}

// Event filter options
export interface EventFilter {
  types?: string[];
  platforms?: string[];
  users?: string[];
  dateFrom?: string;
  dateTo?: string;
}

class EventBus extends EventEmitter {
  // Emit a stream event
  emitEvent(event: StreamEvent) {
    this.emit('event', event);
    
    // Also emit type-specific events for filtering
    this.emit(`event:${event.type}`, event);
    
    // Backward compatibility: emit chat events the old way
    if (event.type === 'chat') {
      this.emit('chat', this.streamEventToChatEvent(event));
    }
  }

  // Listen to all events
  onEvent(listener: (event: StreamEvent) => void) {
    this.on('event', listener);
  }

  // Listen to specific event types
  onEventType(type: StreamEvent['type'], listener: (event: StreamEvent) => void) {
    this.on(`event:${type}`, listener);
  }

  // Backward compatibility: listen to chat messages the old way
  onChatMessage(listener: (event: ChatMessageEvent) => void) {
    this.on('chat', listener);
  }

  // Remove event listeners
  offEvent(listener: (event: StreamEvent) => void) {
    this.off('event', listener);
  }

  offEventType(type: StreamEvent['type'], listener: (event: StreamEvent) => void) {
    this.off(`event:${type}`, listener);
  }

  // Backward compatibility: remove chat listeners
  offChatMessage(listener: (event: ChatMessageEvent) => void) {
    this.off('chat', listener);
  }

  // Convenience method: emit chat message (converts to StreamEvent)
  emitChatMessage(event: ChatMessageEvent) {
    const streamEvent: StreamEvent = {
      type: 'chat',
      platform: event.platform,
      channel: event.channel,
      user: event.user,
      message: event.message,
      tags: event.tags,
      time: event.time,
    };
    this.emitEvent(streamEvent);
  }

  // Filter events based on criteria
  filterEvent(event: StreamEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }
    if (filter.platforms && !filter.platforms.includes(event.platform)) {
      return false;
    }
    if (filter.users && !filter.users.includes(event.user)) {
      return false;
    }
    if (filter.dateFrom && event.time < filter.dateFrom) {
      return false;
    }
    if (filter.dateTo && event.time > filter.dateTo) {
      return false;
    }
    return true;
  }

  // Convert StreamEvent back to ChatMessageEvent for backward compatibility
  private streamEventToChatEvent(event: StreamEvent): ChatMessageEvent {
    return {
      platform: event.platform,
      channel: event.channel,
      user: event.user,
      message: event.message || '',
      tags: event.tags,
      time: event.time,
    };
  }
}

export const eventBus = new EventBus();

// Backward compatibility: export chatBus interface that uses eventBus
export const chatBus = {
  emitChatMessage: (event: ChatMessageEvent) => eventBus.emitChatMessage(event),
  onChatMessage: (listener: (event: ChatMessageEvent) => void) => eventBus.onChatMessage(listener),
  offChatMessage: (listener: (event: ChatMessageEvent) => void) => eventBus.offChatMessage(listener),
};
