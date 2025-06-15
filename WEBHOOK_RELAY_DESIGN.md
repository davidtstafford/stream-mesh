# KICK Webhook Relay Service Design

## Overview
Since KICK only supports webhooks (not WebSockets) for real-time events, we'll create a lightweight webhook-to-WebSocket relay service hosted on Railway's free tier to bridge this gap.

## Architecture

```
KICK API ──[webhooks]──► Railway Service ──[WebSocket]──► Stream Mesh Desktop App
```

### Components

#### 1. Railway Webhook Service (`kick-webhook-relay`)
- **Framework**: Express.js (Node.js)
- **Size**: ~50-100 lines of code
- **Endpoints**:
  - `POST /webhook/kick` - Receives KICK webhooks
  - `GET /health` - Health check
  - `POST /register` - Register Stream Mesh client
  - `POST /unregister` - Unregister client (shutdown)
  - `GET /ws` - WebSocket connection for Stream Mesh

#### 2. Stream Mesh Integration
- **New Service**: `kickWebhookRelayService.ts`
- **Lifecycle Management**: Start/stop webhook service registration
- **Connection**: WebSocket client to Railway service
- **Fallback**: Graceful degradation if service unavailable

## Resource Management Strategy

### Free Tier Optimization
- **Railway Free Tier**: 500 hours/month (~16 hours/day)
- **On-Demand Strategy**: Only wake service when Stream Mesh connects
- **Auto-Sleep**: Service sleeps after 10 minutes of inactivity
- **Smart Scheduling**: Users can set "streaming hours" preference

### Lifecycle Events

```typescript
// Stream Mesh Startup
1. Check if KICK integration enabled
2. If enabled, wake Railway service
3. Register webhook endpoints with KICK
4. Establish WebSocket connection
5. Start receiving events

// Stream Mesh Shutdown
1. Unregister webhooks from KICK
2. Close WebSocket connection  
3. Signal Railway service to sleep
4. Clean up local resources
```

## Implementation Plan

### Phase 1: Railway Service Core
```javascript
// Minimal webhook relay service
const express = require('express');
const WebSocket = require('ws');
const app = express();

const clients = new Map(); // Connected Stream Mesh instances
let sleepTimer = null;

// Webhook endpoint from KICK
app.post('/webhook/kick', (req, res) => {
  const event = req.body;
  // Forward to all connected clients
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });
  res.status(200).send('OK');
});

// WebSocket server for Stream Mesh connections
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  const clientId = generateId();
  clients.set(clientId, ws);
  clearTimeout(sleepTimer); // Cancel sleep when client connects
  
  ws.on('close', () => {
    clients.delete(clientId);
    // Schedule sleep if no clients
    if (clients.size === 0) {
      sleepTimer = setTimeout(() => {
        console.log('No clients - going to sleep');
        process.exit(0); // Railway will sleep the service
      }, 10 * 60 * 1000); // 10 minutes
    }
  });
});
```

### Phase 2: Stream Mesh Integration
```typescript
// New service: src/backend/services/kickWebhookRelayService.ts
export class KickWebhookRelayService extends EventEmitter {
  private ws: WebSocket | null = null;
  private relayUrl = 'wss://kick-webhook-relay.railway.app/ws';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(kickAuth: KickAuthData) {
    try {
      // Wake up Railway service
      await this.wakeRelayService();
      
      // Register webhooks with KICK API
      await this.registerWebhooks(kickAuth);
      
      // Connect WebSocket to relay
      await this.connectWebSocket();
      
      this.emit('connected');
    } catch (error) {
      this.emit('error', error);
    }
  }

  async disconnect() {
    try {
      // Unregister webhooks from KICK
      await this.unregisterWebhooks();
      
      // Close WebSocket (triggers relay service sleep)
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.emit('disconnected');
    } catch (error) {
      console.error('Error during webhook relay disconnect:', error);
    }
  }

  private async wakeRelayService() {
    // Ping health endpoint to wake service
    await fetch('https://kick-webhook-relay.railway.app/health');
  }

  private async registerWebhooks(auth: KickAuthData) {
    // Use KICK API to register webhook endpoints
    const webhookUrl = 'https://kick-webhook-relay.railway.app/webhook/kick';
    
    const events = [
      'channel.chat_message',
      'channel.subscription', 
      'channel.follow',
      'channel.ban'
    ];

    for (const eventType of events) {
      await this.kickApiCall(`/webhooks/subscriptions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: eventType,
          callback: webhookUrl,
          secret: auth.webhookSecret // Generated unique secret
        })
      });
    }
  }
}
```

### Phase 3: Main Process Integration
```typescript
// In main.ts - modify KICK handlers
ipcMain.handle('kick:connect', async (_event, credentials) => {
  try {
    // Check if webhook relay is available
    const relayAvailable = await kickWebhookRelayService.checkAvailability();
    
    if (relayAvailable) {
      // Use webhook relay method
      const result = await platformIntegrationService.connectKickViaWebhook(credentials);
      return result;
    } else {
      // Fallback to disabled state with explanation
      return { 
        connected: false, 
        error: "Webhook relay service unavailable. Please try again later." 
      };
    }
  } catch (err) {
    console.error('kick:connect error:', err);
    throw err;
  }
});

// Add cleanup on app shutdown
app.on('before-quit', async () => {
  console.log('App shutting down - cleaning up webhook relay...');
  await kickWebhookRelayService.disconnect();
  cleanUpTempTTSFiles();
});
```

## Benefits of This Approach

### ✅ **Resource Efficient**
- Railway service only runs when needed
- Automatic sleep after inactivity
- Minimal resource usage (simple relay)

### ✅ **User Friendly** 
- Transparent to end users
- Works exactly like WebSocket integration
- Graceful fallback if service unavailable

### ✅ **Cost Effective**
- Fits within Railway free tier limits
- Multiple users can share same relay service
- No additional costs for Stream Mesh users

### ✅ **Reliable**
- Built-in reconnection logic
- Webhook registration/cleanup
- Status monitoring and health checks

### ✅ **Future Proof**
- Easy to disable when KICK adds WebSocket support
- Infrastructure can be reused for other webhook-only platforms
- Maintains compatibility with existing Stream Mesh features

## Development Timeline

1. **Week 1**: Create Railway webhook relay service
2. **Week 2**: Implement Stream Mesh integration service
3. **Week 3**: Update UI to re-enable KICK with webhook support
4. **Week 4**: Testing, documentation, and deployment

This approach gives Stream Mesh users full KICK integration while staying within free hosting limits and providing a professional, reliable experience! 🎯
