/**
 * KICK Webhook Relay Service
 * 
 * A lightweight service that receives KICK webhooks and relays them
 * to connected Stream Mesh clients via WebSocket connections.
 * 
 * Optimized for Railway's free tier with auto-sleep functionality.
 */

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const crypto = require('crypto');

// Configuration
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-secret-change-me';
const SLEEP_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const NODE_ENV = process.env.NODE_ENV || 'development';

// Application state
const clients = new Map(); // Connected Stream Mesh instances
let sleepTimer = null;
let stats = {
  startTime: new Date(),
  webhooksReceived: 0,
  eventsForwarded: 0,
  clientConnections: 0,
  currentClients: 0
};

// Express app setup
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow WebSocket connections
}));

app.use(cors({
  origin: NODE_ENV === 'production' ? false : true, // Restrict in production
  credentials: true
}));

// Rate limiting
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 webhook requests per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 1000, // Max 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/webhook', webhookLimiter);
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Utility functions
function generateClientId() {
  return crypto.randomBytes(16).toString('hex');
}

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function cancelSleepTimer() {
  if (sleepTimer) {
    clearTimeout(sleepTimer);
    sleepTimer = null;
    console.log('🔄 Sleep timer cancelled - clients connected');
  }
}

function scheduleSleep() {
  if (clients.size === 0 && !sleepTimer) {
    console.log(`😴 No clients connected - scheduling sleep in ${SLEEP_TIMEOUT / 1000}s`);
    sleepTimer = setTimeout(() => {
      console.log('😴 Shutting down due to inactivity');
      process.exit(0);
    }, SLEEP_TIMEOUT);
  }
}

function broadcastToClients(event) {
  let successCount = 0;
  let failureCount = 0;
  
  clients.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(event));
        successCount++;
      } catch (error) {
        console.error(`Failed to send to client ${clientId}:`, error.message);
        failureCount++;
      }
    } else {
      // Clean up dead connections
      clients.delete(clientId);
      failureCount++;
    }
  });
  
  stats.eventsForwarded += successCount;
  stats.currentClients = clients.size;
  
  console.log(`📡 Event broadcast: ${successCount} success, ${failureCount} failed`);
  
  // Schedule sleep if no clients left
  if (clients.size === 0) {
    scheduleSleep();
  }
}

// Routes

/**
 * Health check endpoint
 * Also serves to wake up sleeping Railway service
 */
app.get('/health', (req, res) => {
  const uptime = Date.now() - stats.startTime.getTime();
  
  res.json({
    status: 'healthy',
    uptime: Math.floor(uptime / 1000),
    stats: {
      ...stats,
      currentClients: clients.size
    },
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

/**
 * Status endpoint with detailed information
 */
app.get('/status', (req, res) => {
  res.json({
    service: 'kick-webhook-relay',
    status: 'running',
    clients: {
      connected: clients.size,
      total: stats.clientConnections
    },
    stats,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

/**
 * Main webhook endpoint for KICK events
 */
app.post('/webhook/kick', (req, res) => {
  try {
    stats.webhooksReceived++;
    
    // Verify webhook signature if provided
    const signature = req.headers['x-kick-signature'];
    if (signature) {
      const payload = JSON.stringify(req.body);
      if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
        console.warn('⚠️ Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    const event = req.body;
    
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    // Add relay metadata
    event._relay = {
      receivedAt: new Date().toISOString(),
      service: 'kick-webhook-relay',
      version: '1.0.0'
    };
    
    console.log(`📥 Webhook received: ${event.type || 'unknown'} for ${event.channel || 'unknown channel'}`);
    
    // Broadcast to all connected clients
    if (clients.size > 0) {
      broadcastToClients(event);
    } else {
      console.log('📭 No clients connected - event discarded');
    }
    
    res.status(200).json({ 
      success: true, 
      clients: clients.size,
      eventId: event.id || 'unknown'
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Test endpoint for development
 */
if (NODE_ENV !== 'production') {
  app.post('/test/webhook', (req, res) => {
    const testEvent = {
      type: 'test.message',
      channel: 'test-channel',
      data: req.body,
      timestamp: new Date().toISOString(),
      _test: true
    };
    
    console.log('🧪 Test webhook triggered');
    broadcastToClients(testEvent);
    
    res.json({ 
      success: true, 
      event: testEvent,
      clients: clients.size 
    });
  });
}

// WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws',
  perMessageDeflate: false,
  maxPayload: 1024 * 1024 // 1MB max payload
});

wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`🔗 Client connected: ${clientId} (${clientIp})`);
  
  // Store client connection
  clients.set(clientId, ws);
  stats.clientConnections++;
  stats.currentClients = clients.size;
  
  // Cancel sleep timer when client connects
  cancelSleepTimer();
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection.established',
    clientId,
    timestamp: new Date().toISOString(),
    message: 'Connected to KICK webhook relay'
  }));
  
  // Handle client messages (heartbeat, etc.)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString() 
          }));
          break;
          
        case 'status':
          ws.send(JSON.stringify({
            type: 'status.response',
            stats: {
              ...stats,
              currentClients: clients.size
            },
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          console.log(`📨 Client message: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse client message:', error.message);
    }
  });
  
  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log(`🔌 Client disconnected: ${clientId} (${code} - ${reason || 'No reason'})`);
    clients.delete(clientId);
    stats.currentClients = clients.size;
    
    // Schedule sleep if no clients remaining
    if (clients.size === 0) {
      scheduleSleep();
    }
  });
  
  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error.message);
    clients.delete(clientId);
    stats.currentClients = clients.size;
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📟 SIGTERM received - starting graceful shutdown');
  
  // Close WebSocket server
  wss.close(() => {
    console.log('🔌 WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('🛑 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📟 SIGINT received - starting graceful shutdown');
  process.kill(process.pid, 'SIGTERM');
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 KICK Webhook Relay Service started on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🪝 Webhook endpoint: http://localhost:${PORT}/webhook/kick`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  
  // Schedule initial sleep timer
  scheduleSleep();
});
