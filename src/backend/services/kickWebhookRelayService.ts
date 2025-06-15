// KICK Webhook Relay Service Integration
// This service manages the connection to a Railway-hosted webhook relay
// that bridges KICK's webhook-only API to WebSocket events for Stream Mesh

import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface KickWebhookRelayConfig {
  relayUrl: string;
  healthCheckUrl: string;
  webhookUrl: string;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface KickAuthData {
  accessToken: string;
  channelId: string;
  username: string;
  webhookSecret: string; // Unique secret for webhook verification
}

export class KickWebhookRelayService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: KickWebhookRelayConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connected = false;
  private registeredWebhooks: string[] = [];

  constructor(config?: Partial<KickWebhookRelayConfig>) {
    super();
    
    this.config = {
      relayUrl: 'wss://kick-webhook-relay.railway.app/ws',
      healthCheckUrl: 'https://kick-webhook-relay.railway.app/health',
      webhookUrl: 'https://kick-webhook-relay.railway.app/webhook/kick',
      reconnectAttempts: 5,
      reconnectDelay: 5000,
      ...config
    };
  }

  /**
   * Check if the webhook relay service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.config.healthCheckUrl, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.log('[KickWebhookRelay] Service not available:', error);
      return false;
    }
  }

  /**
   * Connect to KICK via webhook relay
   */
  async connect(auth: KickAuthData): Promise<void> {
    try {
      console.log('[KickWebhookRelay] Starting connection process...');
      
      // Step 1: Wake up the relay service
      await this.wakeRelayService();
      
      // Step 2: Register webhooks with KICK API
      await this.registerWebhooks(auth);
      
      // Step 3: Connect WebSocket to relay service
      await this.connectWebSocket();
      
      this.connected = true;
      this.emit('connected', { username: auth.username });
      console.log('[KickWebhookRelay] Successfully connected');
      
    } catch (error) {
      console.error('[KickWebhookRelay] Connection failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from webhook relay and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[KickWebhookRelay] Disconnecting...');
      
      // Step 1: Unregister webhooks from KICK
      await this.unregisterWebhooks();
      
      // Step 2: Close WebSocket connection
      this.closeWebSocket();
      
      // Step 3: Clear reconnection attempts
      this.clearReconnectTimer();
      
      this.connected = false;
      this.reconnectAttempts = 0;
      this.emit('disconnected');
      console.log('[KickWebhookRelay] Disconnected successfully');
      
    } catch (error) {
      console.error('[KickWebhookRelay] Error during disconnect:', error);
      // Don't throw - we want disconnect to always succeed
    }
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Wake up the Railway service by pinging health endpoint
   */
  private async wakeRelayService(): Promise<void> {
    console.log('[KickWebhookRelay] Waking relay service...');
    
    const response = await fetch(this.config.healthCheckUrl, {
      method: 'GET',
      timeout: 10000 // Give it time to wake up
    });
    
    if (!response.ok) {
      throw new Error(`Failed to wake relay service: ${response.status}`);
    }
    
    // Wait a moment for the service to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Register webhook endpoints with KICK API
   */
  private async registerWebhooks(auth: KickAuthData): Promise<void> {
    console.log('[KickWebhookRelay] Registering webhooks with KICK...');
    
    const events = [
      'channel.chat_message',
      'channel.subscription',
      'channel.follow',
      'channel.ban',
      'channel.subscription.gift'
    ];

    // Clear any existing registrations
    this.registeredWebhooks = [];

    for (const eventType of events) {
      try {
        const webhookId = await this.registerSingleWebhook(auth, eventType);
        this.registeredWebhooks.push(webhookId);
        console.log(`[KickWebhookRelay] Registered webhook for ${eventType}`);
      } catch (error) {
        console.warn(`[KickWebhookRelay] Failed to register webhook for ${eventType}:`, error);
        // Continue with other events even if one fails
      }
    }

    if (this.registeredWebhooks.length === 0) {
      throw new Error('Failed to register any webhooks with KICK');
    }
  }

  /**
   * Register a single webhook with KICK API
   */
  private async registerSingleWebhook(auth: KickAuthData, eventType: string): Promise<string> {
    // Note: This is a placeholder - actual KICK webhook API endpoints need to be determined
    // KICK's webhook API documentation is limited, so this would need to be researched
    
    const response = await fetch('https://kick.com/api/v2/webhooks/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        type: eventType,
        callback: this.config.webhookUrl,
        secret: auth.webhookSecret,
        channel_id: auth.channelId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`KICK webhook registration failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result.id || result.subscription_id;
  }

  /**
   * Unregister all webhooks from KICK
   */
  private async unregisterWebhooks(): Promise<void> {
    if (this.registeredWebhooks.length === 0) {
      return;
    }

    console.log('[KickWebhookRelay] Unregistering webhooks from KICK...');

    for (const webhookId of this.registeredWebhooks) {
      try {
        await this.unregisterSingleWebhook(webhookId);
        console.log(`[KickWebhookRelay] Unregistered webhook ${webhookId}`);
      } catch (error) {
        console.warn(`[KickWebhookRelay] Failed to unregister webhook ${webhookId}:`, error);
      }
    }

    this.registeredWebhooks = [];
  }

  /**
   * Unregister a single webhook from KICK
   */
  private async unregisterSingleWebhook(webhookId: string): Promise<void> {
    // Note: Placeholder implementation - needs actual KICK API endpoints
    const response = await fetch(`https://kick.com/api/v2/webhooks/subscriptions/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getStoredAuth()?.accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to unregister webhook: ${response.status}`);
    }
  }

  /**
   * Connect WebSocket to relay service
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[KickWebhookRelay] Connecting to WebSocket...');
      
      this.ws = new WebSocket(this.config.relayUrl);
      
      this.ws.on('open', () => {
        console.log('[KickWebhookRelay] WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleWebhookEvent(event);
        } catch (error) {
          console.error('[KickWebhookRelay] Failed to parse webhook event:', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[KickWebhookRelay] WebSocket closed: ${code} - ${reason}`);
        this.ws = null;
        
        if (this.connected) {
          // Unexpected closure - attempt reconnection
          this.attemptReconnection();
        }
      });

      this.ws.on('error', (error) => {
        console.error('[KickWebhookRelay] WebSocket error:', error);
        reject(error);
      });

      // Timeout the connection attempt
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming webhook events from relay service
   */
  private handleWebhookEvent(event: any): void {
    try {
      // Transform webhook event to Stream Mesh event format
      const streamEvent = this.transformWebhookEvent(event);
      
      if (streamEvent) {
        this.emit('event', streamEvent);
      }
    } catch (error) {
      console.error('[KickWebhookRelay] Error handling webhook event:', error);
    }
  }

  /**
   * Transform KICK webhook event to Stream Mesh event format
   */
  private transformWebhookEvent(webhookEvent: any): any | null {
    // This would need to be implemented based on KICK's actual webhook payloads
    // For now, return a placeholder transformation
    
    switch (webhookEvent.type) {
      case 'channel.chat_message':
        return {
          type: 'chat',
          platform: 'kick',
          channel: webhookEvent.data.channel,
          user: webhookEvent.data.user.username,
          message: webhookEvent.data.message,
          time: webhookEvent.timestamp || new Date().toISOString(),
          tags: webhookEvent.data
        };
        
      case 'channel.follow':
        return {
          type: 'channel.followed',
          platform: 'kick',
          channel: webhookEvent.data.channel,
          user: webhookEvent.data.user.username,
          time: webhookEvent.timestamp || new Date().toISOString(),
          tags: webhookEvent.data
        };
        
      case 'channel.subscription':
        return {
          type: 'channel.subscription.new',
          platform: 'kick',
          channel: webhookEvent.data.channel,
          user: webhookEvent.data.user.username,
          amount: webhookEvent.data.months || 1,
          time: webhookEvent.timestamp || new Date().toISOString(),
          tags: webhookEvent.data
        };
        
      default:
        console.log(`[KickWebhookRelay] Unknown webhook event type: ${webhookEvent.type}`);
        return null;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('[KickWebhookRelay] Max reconnection attempts reached');
      this.connected = false;
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`[KickWebhookRelay] Attempting reconnection ${this.reconnectAttempts}/${this.config.reconnectAttempts}...`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connectWebSocket();
      } catch (error) {
        console.error('[KickWebhookRelay] Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, this.config.reconnectDelay);
  }

  /**
   * Close WebSocket connection
   */
  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get stored authentication data (placeholder)
   */
  private getStoredAuth(): KickAuthData | null {
    // This would integrate with Stream Mesh's auth storage
    return null;
  }
}

// Export singleton instance
export const kickWebhookRelayService = new KickWebhookRelayService();
