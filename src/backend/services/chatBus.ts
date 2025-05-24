import { EventEmitter } from 'events';

export interface ChatMessageEvent {
  platform: string;
  channel: string;
  user: string;
  message: string;
  tags?: any;
  time: string;
}

class ChatBus extends EventEmitter {
  emitChatMessage(event: ChatMessageEvent) {
    this.emit('chat', event);
  }
  onChatMessage(listener: (event: ChatMessageEvent) => void) {
    this.on('chat', listener);
  }
  offChatMessage(listener: (event: ChatMessageEvent) => void) {
    this.off('chat', listener);
  }
}

export const chatBus = new ChatBus();
