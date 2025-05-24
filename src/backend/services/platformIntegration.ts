// Twitch integration service (MVP, extensible for more platforms)
import { EventEmitter } from 'events';
import tmi from 'tmi.js';
import { chatBus } from './chatBus';

export type Platform = 'twitch';

export interface PlatformConnection {
  platform: Platform;
  username: string;
  connected: boolean;
}

export interface TwitchAuth {
  username: string;
  accessToken: string;
}

class PlatformIntegrationService extends EventEmitter {
  private connections: Record<Platform, PlatformConnection> = {
    twitch: { platform: 'twitch', username: '', connected: false },
  };
  private twitchClient: any = null;
  private twitchAuth: TwitchAuth | null = null;

  connectTwitch(username: string) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new Error('A valid Twitch username is required.');
    }
    // Simulate connection logic (replace with real Twitch API later)
    this.connections.twitch = { platform: 'twitch', username, connected: true };
    this.emit('status', this.connections.twitch);
    return this.connections.twitch;
  }

  async connectTwitchWithOAuth(auth: TwitchAuth) {
    if (!auth.username || !auth.accessToken) {
      throw new Error('Username and access token are required.');
    }
    if (this.twitchClient) {
      await this.twitchClient.disconnect();
    }
    this.twitchAuth = auth;
    this.twitchClient = new tmi.client({
      options: { debug: true },
      identity: {
        username: auth.username,
        password: `oauth:${auth.accessToken}`,
      },
      channels: [auth.username],
    });
    await this.twitchClient.connect();
    this.connections.twitch = { platform: 'twitch', username: auth.username, connected: true };
    this.emit('status', this.connections.twitch);
    // Listen for chat messages and emit events
    this.twitchClient.on('message', (channel: string, tags: any, message: string, self: boolean) => {
      if (!self) {
        const chatEvent = {
          platform: 'twitch',
          channel,
          user: tags['display-name'] || tags.username,
          message,
          tags,
          time: new Date().toISOString(),
        };
        chatBus.emitChatMessage(chatEvent);
        this.emit('chat', chatEvent); // (optional: for legacy or direct listeners)
      }
    });
    return this.connections.twitch;
  }

  async disconnectTwitch() {
    if (this.twitchClient) {
      await this.twitchClient.disconnect();
      this.twitchClient = null;
    }
    this.twitchAuth = null;
    this.connections.twitch = { platform: 'twitch', username: '', connected: false };
    this.emit('status', this.connections.twitch);
    return this.connections.twitch;
  }

  getTwitchStatus() {
    return this.connections.twitch;
  }
}

export const platformIntegrationService = new PlatformIntegrationService();
