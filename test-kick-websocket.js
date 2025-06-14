#!/usr/bin/env node

/**
 * KICK WebSocket Connection Test
 * 
 * This script tests the KICK WebSocket connection to diagnose why real KICK chat
 * messages aren't being processed. It simulates the connection flow used by the
 * main application.
 */

const WebSocket = require('ws');

// Test immediately to see if there are any basic issues
console.log('🧪 KICK WebSocket Connection Test Starting...');
console.log('Node.js version:', process.version);
console.log('WebSocket module loaded:', typeof WebSocket);

// Test configuration - replace with real channel data for testing
const TEST_CONFIG = {
  username: 'streammesh_test', // Replace with actual KICK channel username
  channelId: '1234567', // Replace with actual channel ID
  PUSHER_APP_KEY: '32cbd69e4b950bf97679',
  PUSHER_CLUSTER: 'us2'
};

async function fetchChannelInfo(username) {
  console.log(`📡 Fetching channel info for: ${username}`);
  
  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${username}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const channelInfo = await response.json();
    console.log('✅ Channel info fetched successfully');
    console.log(`   Channel ID: ${channelInfo.id}`);
    console.log(`   Chatroom ID: ${channelInfo.chatroom?.id}`);
    console.log(`   Channel Status: ${channelInfo.livestream ? 'Live' : 'Offline'}`);
    
    return channelInfo;
  } catch (error) {
    console.error('❌ Failed to fetch channel info:', error.message);
    throw error;
  }
}

function testWebSocketConnection(chatroomId, channelId) {
  return new Promise((resolve, reject) => {
    const wsUrl = `wss://ws-${TEST_CONFIG.PUSHER_CLUSTER}.pusher.app/app/${TEST_CONFIG.PUSHER_APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
    
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    let connectionEstablished = false;
    let subscriptionCount = 0;
    let eventCount = 0;
    
    // Set timeout for test
    const timeout = setTimeout(() => {
      console.log('⏰ Test timeout reached (30 seconds)');
      ws.close();
      resolve({
        success: connectionEstablished,
        subscriptions: subscriptionCount,
        events: eventCount
      });
    }, 30000);

    ws.on('open', () => {
      console.log('✅ WebSocket connection opened');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.event) {
          case 'pusher:connection_established':
            console.log('🎉 Pusher connection established');
            connectionEstablished = true;
            
            // Subscribe to chat messages
            const chatSubscription = {
              event: 'pusher:subscribe',
              data: {
                auth: '',
                channel: `chatrooms.${chatroomId}.v2`
              }
            };
            ws.send(JSON.stringify(chatSubscription));
            console.log(`📨 Subscribed to chat: chatrooms.${chatroomId}.v2`);
            
            // Subscribe to channel events
            const channelSubscription = {
              event: 'pusher:subscribe',
              data: {
                auth: '',
                channel: `channel.${channelId}`
              }
            };
            ws.send(JSON.stringify(channelSubscription));
            console.log(`📨 Subscribed to channel: channel.${channelId}`);
            break;
            
          case 'pusher:subscription_succeeded':
            subscriptionCount++;
            console.log(`✅ Subscription successful: ${message.channel} (${subscriptionCount}/2)`);
            break;
            
          case 'App\\Events\\ChatMessageEvent':
            eventCount++;
            const chatData = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
            console.log(`💬 Chat message #${eventCount}:`, {
              user: chatData.sender?.username,
              message: chatData.content?.substring(0, 50) + '...',
              type: chatData.type
            });
            break;
            
          case 'App\\Events\\FollowersUpdated':
            eventCount++;
            console.log(`👤 Follow event #${eventCount}:`, message.data);
            break;
            
          case 'App\\Events\\SubscriptionEvent':
            eventCount++;
            console.log(`⭐ Subscription event #${eventCount}:`, message.data);
            break;
            
          default:
            if (message.event && !message.event.startsWith('pusher:')) {
              console.log(`🔔 Unknown event: ${message.event}`);
            }
        }
        
      } catch (error) {
        console.error('❌ Failed to parse message:', error.message);
        console.log('Raw message:', data.toString().substring(0, 200));
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason || 'No reason'}`);
      clearTimeout(timeout);
      resolve({
        success: connectionEstablished,
        subscriptions: subscriptionCount,
        events: eventCount
      });
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function runTest() {
  console.log('🧪 KICK WebSocket Connection Test Starting...\n');
  
  try {
    // Step 1: Fetch channel information
    const channelInfo = await fetchChannelInfo(TEST_CONFIG.username);
    const chatroomId = channelInfo.chatroom?.id;
    const channelId = channelInfo.id;
    
    if (!chatroomId) {
      throw new Error('Could not get chatroom ID from channel info');
    }
    
    console.log('\n🔍 Test Configuration:');
    console.log(`   Username: ${TEST_CONFIG.username}`);
    console.log(`   Channel ID: ${channelId}`);
    console.log(`   Chatroom ID: ${chatroomId}`);
    console.log(`   Pusher App Key: ${TEST_CONFIG.PUSHER_APP_KEY}`);
    console.log(`   Pusher Cluster: ${TEST_CONFIG.PUSHER_CLUSTER}\n`);
    
    // Step 2: Test WebSocket connection
    const result = await testWebSocketConnection(chatroomId, channelId);
    
    console.log('\n📊 Test Results:');
    console.log(`   Connection Established: ${result.success ? '✅' : '❌'}`);
    console.log(`   Successful Subscriptions: ${result.subscriptions}/2`);
    console.log(`   Events Received: ${result.events}`);
    
    if (result.success && result.subscriptions === 2) {
      console.log('\n🎉 WebSocket connection test PASSED!');
      if (result.events === 0) {
        console.log('💡 No events received - this might be normal if the channel is not active.');
        console.log('   Try testing during an active stream or with a more active channel.');
      }
    } else {
      console.log('\n❌ WebSocket connection test FAILED!');
      console.log('   Check the channel username and ensure it exists on KICK.');
      console.log('   Verify the Pusher app key and cluster settings.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  TEST_CONFIG.username = process.argv[2];
  console.log(`Using custom username: ${TEST_CONFIG.username}`);
}

// Add polyfill for fetch if not available (for older Node.js versions)
if (typeof fetch === 'undefined') {
  console.log('⚠️  Fetch not available, attempting to use node-fetch...');
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('❌ node-fetch not available. Please install it: npm install node-fetch');
    process.exit(1);
  }
}

runTest().catch(console.error);
