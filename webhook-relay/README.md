# KICK Webhook Relay Service for Railway

A lightweight Node.js service that bridges KICK's webhook-only API to WebSocket connections for Stream Mesh desktop applications.

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/kick-webhook-relay)

## Overview

KICK's streaming API only supports webhooks for real-time events, which don't work for desktop applications that need publicly accessible URLs. This service solves that by:

1. **Receiving KICK webhooks** at publicly accessible endpoints
2. **Relaying events** to connected Stream Mesh clients via WebSocket
3. **Managing lifecycle** - automatically sleeps when no clients connected
4. **Resource optimization** - stays within Railway's free tier limits

## Architecture

```
KICK API ──[webhooks]──► Railway Service ──[WebSocket]──► Stream Mesh Apps
```

## Features

- 🚀 **Zero-config deployment** on Railway
- 📡 **WebSocket relay** for real-time events  
- 😴 **Auto-sleep** when inactive (saves resources)
- 🔒 **Webhook verification** with secrets
- 📊 **Health monitoring** and status endpoints
- ⚡ **Instant wake-up** when Stream Mesh connects

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and wakes up sleeping service.

### Webhook Receiver  
```
POST /webhook/kick
```
Receives webhooks from KICK API and forwards to connected clients.

### WebSocket Connection
```
WS /ws
```
WebSocket endpoint for Stream Mesh clients to connect.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `WEBHOOK_SECRET` | Shared secret for webhook verification | Required |

## Local Development

```bash
# Clone this template
git clone <repository-url>
cd kick-webhook-relay

# Install dependencies
npm install

# Set environment variables
export WEBHOOK_SECRET=your-secret-here

# Start development server
npm run dev
```

## Deployment

1. **Fork this repository**
2. **Deploy to Railway**: Click the deploy button above
3. **Set environment variables** in Railway dashboard
4. **Configure Stream Mesh** to use your deployed URL

## Resource Usage

Optimized for Railway's free tier:
- **Memory**: ~30MB when active, 0MB when sleeping
- **CPU**: Minimal usage, only active during event relay
- **Network**: Only incoming webhooks and outgoing WebSocket messages
- **Storage**: None required

## Stream Mesh Integration

This service is designed to work seamlessly with Stream Mesh's KICK integration:

1. Stream Mesh detects webhook relay availability
2. Registers webhooks with KICK API pointing to this service  
3. Connects via WebSocket to receive real-time events
4. Service automatically sleeps when Stream Mesh disconnects

## Security

- **Webhook verification** using shared secrets
- **CORS protection** with allowed origins
- **Rate limiting** on webhook endpoints
- **Input validation** and sanitization

## License

MIT License - see LICENSE file for details
