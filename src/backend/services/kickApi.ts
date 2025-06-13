// KICK API service for handling KICK-specific API calls

const CLIENT_ID = '01JXMTP4GNFCM5YJG5EDPSBWMB';

export interface KickTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface KickUser {
  id: number;
  username: string;
  slug: string;
  email?: string;
  profile_pic?: string;
}

export interface KickChannel {
  id: number;
  user_id: number;
  slug: string;
  is_live: boolean;
  category: {
    id: number;
    name: string;
  };
  livestream?: {
    id: number;
    is_live: boolean;
    viewer_count: number;
  };
}

export interface KickApiError extends Error {
  status?: number;
  response?: any;
}

export class KickApiService {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private onTokenRefresh?: (newAuth: { accessToken: string; refreshToken: string; expiresAt: number }) => void;

  constructor(
    accessToken: string, 
    refreshToken: string, 
    expiresAt: number,
    onTokenRefresh?: (newAuth: { accessToken: string; refreshToken: string; expiresAt: number }) => void
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
    this.onTokenRefresh = onTokenRefresh;
  }

  // Ensure we have a valid access token, refresh if needed
  private async ensureValidToken(): Promise<void> {
    if (Date.now() >= this.expiresAt - 60000) { // Refresh 1 minute before expiry
      try {
        console.log('[KickApi] Token expires soon, refreshing...');
        const refreshedTokens = await this.refreshToken_internal(this.refreshToken);
        
        this.accessToken = refreshedTokens.access_token;
        this.refreshToken = refreshedTokens.refresh_token;
        this.expiresAt = Date.now() + (refreshedTokens.expires_in * 1000);
        
        // Notify the caller (usually main.ts) to save the new tokens
        if (this.onTokenRefresh) {
          this.onTokenRefresh({
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            expiresAt: this.expiresAt
          });
        }
        
        console.log('[KickApi] Token refreshed successfully');
      } catch (error) {
        console.error('[KickApi] Failed to refresh token:', error);
        throw new Error('Failed to refresh KICK access token');
      }
    }
  }

  // Make authenticated API request
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureValidToken();
    
    const url = endpoint.startsWith('http') ? endpoint : `https://kick.com/api/v2${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      const error = new Error(`KICK API error: ${response.status} ${response.statusText}`) as KickApiError;
      error.status = response.status;
      error.response = errorBody;
      throw error;
    }

    return await response.json();
  }

  // Get current user information
  async getCurrentUser(): Promise<KickUser> {
    return this.apiRequest<KickUser>('/user');
  }

  // Get channel information by slug
  async getChannel(slug: string): Promise<KickChannel> {
    return this.apiRequest<KickChannel>(`/channels/${slug}`);
  }

  // Send a chat message to a channel
  async sendChatMessage(channelSlug: string, message: string): Promise<void> {
    try {
      await this.apiRequest(`/channels/${channelSlug}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: message,
          type: 'message'
        }),
      });
    } catch (error) {
      console.error('[KickApi] Failed to send chat message:', error);
      throw error;
    }
  }

  // Get chatroom ID for WebSocket connection
  async getChatroomId(channelSlug: string): Promise<number> {
    const channel = await this.getChannel(channelSlug);
    // KICK API typically returns chatroom info in the channel response
    // This is a placeholder - actual implementation may need different endpoint
    return channel.id;
  }

  // Update tokens (called when refreshed externally)
  updateTokens(accessToken: string, refreshToken: string, expiresAt: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
  }

  // Internal token refresh method to avoid circular dependency
  private async refreshToken_internal(refreshToken: string): Promise<KickTokenResponse> {
    const response = await fetch('https://kick.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  }
}

// Factory function to create KICK API service
export function createKickApiService(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  onTokenRefresh?: (newAuth: { accessToken: string; refreshToken: string; expiresAt: number }) => void
): KickApiService {
  return new KickApiService(accessToken, refreshToken, expiresAt, onTokenRefresh);
}
