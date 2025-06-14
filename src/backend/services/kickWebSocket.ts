// KICK WebSocket service for real-time events
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { eventBus } from './eventBus';

// Map KICK user badges to Stream Mesh permission levels
function mapKickRoleToPermission(badges: Array<{ type: string; text: string; count?: number }>): string {
  if (!badges || badges.length === 0) return 'viewer';
  
  // Check for KICK-specific roles in order of priority
  for (const badge of badges) {
    switch (badge.type?.toLowerCase()) {
      case 'broadcaster':
      case 'owner':
        return 'super_moderator';
      case 'moderator':
      case 'mod':
        return 'moderator';
      case 'vip':
        return 'moderator'; // VIPs get mod privileges in Stream Mesh
      case 'og':
      case 'founder':
      case 'subscriber':
      case 'sub':
        return 'viewer'; // Subscribers are still viewers for command purposes
      default:
        continue;
    }
  }
  
  return 'viewer';
}

interface KickWebSocketConfig {
  channelId: string;
  accessToken: string;
  username: string;
}

interface KickChatMessage {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: {
      color: string;
      badges: Array<{
        type: string;
        text: string;
        count?: number;
      }>;
    };
  };
}

interface KickFollowEvent {
  channel_id: number;
  user_id: number;
  username: string;
  followed_at: string;
}

interface KickSubscriptionEvent {
  channel_id: number;
  user_id: number;
  username: string;
  months: number;
  subscription_tier: string;
  created_at: string;
}

class KickWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: KickWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connected = false;
  private shouldReconnect = true;

  // KICK uses Pusher WebSocket for real-time events
  private readonly PUSHER_APP_KEY = '32cbd69e4b950bf97679';
  private readonly PUSHER_CLUSTER = 'us2';

  constructor() {
    super();
    console.log('[KickWebSocket] Service initialized');
  }

  async connect(config: KickWebSocketConfig): Promise<void> {
    console.log('[KickWebSocket] Connecting to KICK WebSocket...', { username: config.username });
    
    this.config = config;
    this.shouldReconnect = true;
    
    try {
      // Get channel information first to get the chatroom ID
      const channelInfo = await this.fetchChannelInfo(config.username);
      const chatroomId = channelInfo.chatroom?.id;
      
      if (!chatroomId) {
        throw new Error('Could not get chatroom ID for channel');
      }

      // Connect to Pusher WebSocket
      const wsUrl = `wss://ws-${this.PUSHER_CLUSTER}.pusher.app/app/${this.PUSHER_APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('[KickWebSocket] Connected to Pusher');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // Subscribe to channel events
        this.subscribeToChannelEvents(chatroomId, config.channelId);
        
        this.emit('connected');
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', (code, reason) => {
        console.log('[KickWebSocket] Connection closed:', code, reason || 'No reason provided');
        this.connected = false;
        this.stopHeartbeat();
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
        
        this.emit('disconnected');
      });

      this.ws.on('error', (error) => {
        console.error('[KickWebSocket] Connection error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('[KickWebSocket] Failed to connect:', error);
      throw error;
    }
  }

  private async fetchChannelInfo(username: string): Promise<any> {
    const response = await fetch(`https://kick.com/api/v2/channels/${username}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch channel info: ${response.status}`);
    }
    return response.json();
  }

  private subscribeToChannelEvents(chatroomId: number, channelId: string): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN = 1
      console.error('[KickWebSocket] Cannot subscribe - WebSocket not connected');
      return;
    }

    // Subscribe to chat messages
    this.subscribe(`chatrooms.${chatroomId}.v2`);
    
    // Subscribe to channel events (follows, subscriptions, etc.)
    this.subscribe(`channel.${channelId}`);
    
    console.log('[KickWebSocket] Subscribed to channel events', { chatroomId, channelId });
  }

  private subscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== 1) return; // WebSocket.OPEN = 1

    const subscribeMessage = {
      event: 'pusher:subscribe',
      data: {
        auth: '', // KICK channels are typically public
        channel: channel
      }
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log('[KickWebSocket] Subscribed to channel:', channel);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      // Handle Pusher protocol messages
      if (message.event === 'pusher:connection_established') {
        console.log('[KickWebSocket] Pusher connection established');
        return;
      }
      
      if (message.event === 'pusher:subscription_succeeded') {
        console.log('[KickWebSocket] Subscribed to channel:', message.channel);
        return;
      }

      // Handle KICK events
      this.processKickEvent(message);
      
    } catch (error) {
      console.error('[KickWebSocket] Failed to parse message:', error, data);
    }
  }

  private processKickEvent(message: any): void {
    const { event, channel, data } = message;
    
    if (!event || !data) return;

    try {
      const eventData = typeof data === 'string' ? JSON.parse(data) : data;
      
      switch (event) {
        case 'App\\Events\\ChatMessageEvent':
          this.handleChatMessage(eventData);
          break;
          
        case 'App\\Events\\FollowersUpdated':
          this.handleFollowEvent(eventData);
          break;
          
        case 'App\\Events\\SubscriptionEvent':
          this.handleSubscriptionEvent(eventData);
          break;
          
        case 'App\\Events\\StreamHostEvent':
          this.handleRaidEvent(eventData);
          break;
          
        default:
          console.log('[KickWebSocket] Unhandled event:', event, eventData);
      }
    } catch (error) {
      console.error('[KickWebSocket] Failed to process event:', error, message);
    }
  }

  private handleChatMessage(data: KickChatMessage): void {
    if (!data.sender || !data.content) return;

    // Skip bot messages
    if (data.type === 'bot') return;

    // Map KICK user role to Stream Mesh permissions
    const badges = data.sender.identity?.badges || [];
    const role = mapKickRoleToPermission(badges);

    const streamEvent = {
      type: 'chat' as const,
      platform: 'kick' as const,
      channel: this.config?.username || 'unknown',
      user: data.sender.username,
      message: data.content,
      time: new Date(data.created_at).toISOString(),
      tags: {
        'user-id': data.sender.id.toString(),
        'message-id': data.id,
        'chatroom-id': data.chatroom_id.toString(),
        'color': data.sender.identity?.color || '#FFFFFF',
        'badges': JSON.stringify(badges),
        'role': role // Add role for permission checking
      }
    };

    console.log('[KickWebSocket] Chat message:', streamEvent);
    eventBus.emitEvent(streamEvent);
  }

  private handleFollowEvent(data: KickFollowEvent): void {
    const streamEvent = {
      type: 'channel.followed' as const,
      platform: 'kick' as const,
      channel: this.config?.username || 'unknown',
      user: data.username,
      time: new Date(data.followed_at).toISOString(),
      tags: {
        'user-id': data.user_id.toString(),
        'channel-id': data.channel_id.toString()
      }
    };

    console.log('[KickWebSocket] Follow event:', streamEvent);
    eventBus.emitEvent(streamEvent);
  }

  private handleSubscriptionEvent(data: KickSubscriptionEvent): void {
    const streamEvent = {
      type: 'channel.subscription.new' as const,
      platform: 'kick' as const,
      channel: this.config?.username || 'unknown',
      user: data.username,
      amount: data.months,
      time: new Date(data.created_at).toISOString(),
      tags: {
        'user-id': data.user_id.toString(),
        'channel-id': data.channel_id.toString(),
        'months': data.months.toString(),
        'tier': data.subscription_tier
      }
    };

    console.log('[KickWebSocket] Subscription event:', streamEvent);
    eventBus.emitEvent(streamEvent);
  }

  private handleRaidEvent(data: any): void {
    if (!data.host_username) return;

    const streamEvent = {
      type: 'raided' as const,
      platform: 'kick' as const,
      channel: this.config?.username || 'unknown',
      user: data.host_username,
      amount: data.viewer_count || 0,
      time: new Date().toISOString(),
      tags: {
        'viewer-count': data.viewer_count?.toString() || '0',
        'host-channel': data.host_username
      }
    };

    console.log('[KickWebSocket] Raid event:', streamEvent);
    eventBus.emitEvent(streamEvent);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN = 1
        this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[KickWebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.shouldReconnect && this.config) {
        console.log(`[KickWebSocket] Reconnect attempt ${this.reconnectAttempts}`);
        this.connect(this.config);
      }
    }, delay);
  }

  disconnect(): void {
    console.log('[KickWebSocket] Disconnecting...');
    this.shouldReconnect = false;
    this.connected = false;
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.config = null;
    this.reconnectAttempts = 0;
    
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === 1; // WebSocket.OPEN = 1
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case 0: return 'connecting'; // WebSocket.CONNECTING = 0
      case 1: return 'connected';  // WebSocket.OPEN = 1
      case 2: return 'closing';    // WebSocket.CLOSING = 2
      case 3: return 'disconnected'; // WebSocket.CLOSED = 3
      default: return 'unknown';
    }
  }
}

// Export singleton instance
export const kickWebSocketService = new KickWebSocketService();
