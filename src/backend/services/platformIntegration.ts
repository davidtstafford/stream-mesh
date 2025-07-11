// Twitch integration service (MVP, extensible for more platforms)
import { EventEmitter } from 'events';
import tmi from 'tmi.js';
import { eventBus } from './eventBus';
import type { KickApiService } from './kickApi';
import { createKickApiService } from './kickApi';
import { kickWebSocketService } from './kickWebSocket';

export type Platform = 'twitch' | 'kick';

export interface PlatformConnection {
  platform: Platform;
  username: string;
  connected: boolean;
}

export interface TwitchAuth {
  username: string;
  accessToken: string;
}

export interface KickAuth {
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class PlatformIntegrationService extends EventEmitter {
  private connections: Record<Platform, PlatformConnection> = {
    twitch: { platform: 'twitch', username: '', connected: false },
    kick: { platform: 'kick', username: '', connected: false },
  };
  private twitchClient: any = null;
  private twitchAuth: TwitchAuth | null = null;
  private kickAuth: KickAuth | null = null;
  private kickApiService: KickApiService | null = null;

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
          type: 'chat' as const,
          platform: 'twitch' as const,
          channel,
          user: tags['display-name'] || tags.username,
          message,
          tags,
          time: new Date().toISOString(),
        };
        eventBus.emitEvent(chatEvent);
        this.emit('chat', chatEvent); // (optional: for legacy or direct listeners)
      }
    });

    // Listen for subscription events
    this.twitchClient.on('subscription', (channel: string, username: string, method: any, message: string, tags: any) => {
      const subscriptionEvent = {
        type: 'subscription' as const,
        platform: 'twitch' as const,
        channel,
        user: username,
        message: message || undefined,
        amount: parseInt(method?.prime ? '0' : method?.plan || '1000') / 1000, // Convert to tier (1, 2, 3)
        data: { method, plan: method?.plan, isPrime: method?.prime },
        tags,
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(subscriptionEvent);
      this.emit('subscription', subscriptionEvent);
    });

    // Listen for resubscription events
    this.twitchClient.on('resub', (channel: string, username: string, months: number, message: string, tags: any, method: any) => {
      const resubEvent = {
        type: 'resub' as const,
        platform: 'twitch' as const,
        channel,
        user: username,
        message: message || undefined,
        amount: parseInt(method?.plan || '1000') / 1000, // Convert to tier
        data: { months, method, plan: method?.plan, cumulativeMonths: tags?.['msg-param-cumulative-months'] },
        tags,
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(resubEvent);
      this.emit('resub', resubEvent);
    });

    // Listen for gifted subscription events
    this.twitchClient.on('subgift', (channel: string, username: string, streakMonths: number, recipient: string, method: any, tags: any) => {
      const subgiftEvent = {
        type: 'subgift' as const,
        platform: 'twitch' as const,
        channel,
        user: username,
        message: undefined,
        amount: parseInt(method?.plan || '1000') / 1000, // Convert to tier
        data: { recipient, streakMonths, method, plan: method?.plan },
        tags,
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(subgiftEvent);
      this.emit('subgift', subgiftEvent);
    });

    // Listen for cheer events (bits)
    this.twitchClient.on('cheer', (channel: string, tags: any, message: string) => {
      const cheerEvent = {
        type: 'cheer' as const,
        platform: 'twitch' as const,
        channel,
        user: tags['display-name'] || tags.username,
        message: message || undefined,
        amount: parseInt(tags.bits || '0'),
        data: { bits: tags.bits },
        tags,
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(cheerEvent);
      this.emit('cheer', cheerEvent);
    });

    // Listen for host events
    this.twitchClient.on('hosted', (channel: string, username: string, viewers: number, autohost: boolean) => {
      const hostedEvent = {
        type: 'hosted' as const,
        platform: 'twitch' as const,
        channel,
        user: username,
        message: undefined,
        amount: viewers,
        data: { autohost },
        tags: undefined,
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(hostedEvent);
      this.emit('hosted', hostedEvent);
    });

    // Listen for raid events
    this.twitchClient.on('raided', (channel: string, username: string, viewers: number) => {
      const raidedEvent = {
        type: 'raided' as const,
        platform: 'twitch' as const,
        channel,
        user: username,
        message: undefined,
        amount: viewers,
        data: undefined,
        tags: undefined,
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(raidedEvent);
      this.emit('raided', raidedEvent);
    });

    // Note: Channel point redemptions require EventSub integration
    // tmi.js doesn't support channel points directly
    // TODO: Implement EventSub WebSocket connection for channel.channel_points_custom_reward_redemption.add
    // For now, redemption events can be triggered via developer tools
    
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

  // KICK connection methods
  async connectKickWithOAuth(auth: KickAuth) {
    if (!auth.username || !auth.accessToken) {
      throw new Error('Username and access token are required for KICK.');
    }
    
    this.kickAuth = auth;
    
    // Create KICK API service with token refresh callback
    this.kickApiService = createKickApiService(
      auth.accessToken,
      auth.refreshToken,
      auth.expiresAt,
      (newAuth: { accessToken: string; refreshToken: string; expiresAt: number }) => {
        // Update stored auth when tokens are refreshed
        if (this.kickAuth) {
          this.kickAuth.accessToken = newAuth.accessToken;
          this.kickAuth.refreshToken = newAuth.refreshToken;
          this.kickAuth.expiresAt = newAuth.expiresAt;
          
          // Emit event so main.ts can save the updated tokens
          this.emit('kick-token-refreshed', this.kickAuth);
        }
      }
    );
    
    // Get channel information to extract channel ID for WebSocket
    try {
      const userInfo = await this.kickApiService.getCurrentUser();
      const channelId = userInfo.id?.toString();
      
      if (!channelId) {
        throw new Error('Could not get channel ID for WebSocket connection');
      }
      
      // Connect to KICK WebSocket for real-time events
      console.log('[PlatformIntegration] Connecting to KICK WebSocket...', { username: auth.username, channelId });
      try {
        await kickWebSocketService.connect({
          channelId,
          accessToken: auth.accessToken,
          username: auth.username
        });
        console.log('[PlatformIntegration] KICK WebSocket connected successfully');
      } catch (wsError) {
        console.error('[PlatformIntegration] KICK WebSocket connection failed:', wsError);
        console.log('[PlatformIntegration] Note: KICK may require webhook subscriptions instead of WebSocket');
        // Don't fail the entire connection if WebSocket fails
      }
      
    } catch (error) {
      console.error('[PlatformIntegration] Failed to connect KICK WebSocket:', error);
      // Don't fail the entire connection if WebSocket fails
      console.warn('[PlatformIntegration] Continuing without real-time events - check WebSocket connection');
    }
    
    this.connections.kick = { platform: 'kick', username: auth.username, connected: true };
    this.emit('status', this.connections.kick);
    
    return this.connections.kick;
  }

  async disconnectKick() {
    // Disconnect KICK WebSocket
    console.log('[PlatformIntegration] Disconnecting KICK WebSocket...');
    kickWebSocketService.disconnect();
    
    this.kickAuth = null;
    this.kickApiService = null;
    this.connections.kick = { platform: 'kick', username: '', connected: false };
    this.emit('status', this.connections.kick);
    return this.connections.kick;
  }

  getKickStatus() {
    return this.connections.kick;
  }

  // Send a chat message to the connected platform
  async sendChatMessage(message: string, platform: Platform = 'twitch', skipTTS: boolean = true): Promise<void> {
    if (platform === 'twitch') {
      if (!this.connections.twitch.connected || !this.twitchClient) {
        throw new Error('Not connected to Twitch');
      }
      
      // Use tmi.js to send the message to the channel
      const channel = this.connections.twitch.username;
      await this.twitchClient.say(channel, message);
      
      // Emit a chat event for our own message so it appears in the UI
      const chatEvent = {
        type: 'chat' as const,
        platform: 'twitch' as const,
        channel,
        user: this.connections.twitch.username,
        message,
        tags: {
          'user-id': 'bot',
          'display-name': this.connections.twitch.username,
          'is-bot-message': skipTTS ? 'true' : 'false' // Mark bot messages to skip TTS
        },
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(chatEvent);
      this.emit('chat', chatEvent);
    } else if (platform === 'kick') {
      if (!this.connections.kick.connected || !this.kickApiService) {
        throw new Error('Not connected to KICK');
      }
      
      // Send message using KICK API service
      const channelSlug = this.connections.kick.username;
      await this.kickApiService.sendChatMessage(channelSlug, message);
      
      // Emit a chat event for our own message so it appears in the UI
      const chatEvent = {
        type: 'chat.message.sent' as const,
        platform: 'kick' as const,
        channel: this.connections.kick.username,
        user: this.connections.kick.username,
        message,
        tags: {
          'user-id': 'bot',
          'display-name': this.connections.kick.username,
          'is-bot-message': skipTTS ? 'true' : 'false' // Mark bot messages to skip TTS
        },
        time: new Date().toISOString(),
      };
      eventBus.emitEvent(chatEvent);
      this.emit('chat', chatEvent);
    } else {
      throw new Error(`Platform ${platform} not supported for sending messages`);
    }
  }

  // Manual method to trigger channel point redemption events
  // This can be used for testing and will be replaced with EventSub integration later
  triggerChannelPointRedemption(rewardTitle: string, username: string, userInput?: string, cost?: number) {
    if (!this.connections.twitch.connected) {
      throw new Error('Not connected to Twitch');
    }

    const redeemEvent = {
      type: 'redeem' as const,
      platform: 'twitch' as const,
      channel: this.connections.twitch.username,
      user: username,
      message: userInput || undefined,
      amount: cost || 0,
      data: { 
        rewardTitle,
        rewardCost: cost || 0,
        userInput: userInput || null
      },
      tags: undefined,
      time: new Date().toISOString(),
    };
    
    eventBus.emitEvent(redeemEvent);
    this.emit('redeem', redeemEvent);
    return redeemEvent;
  }
}

export const platformIntegrationService = new PlatformIntegrationService();
