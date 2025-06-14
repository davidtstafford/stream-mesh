#!/usr/bin/env node

console.log('🧪 Simple KICK API Test');

async function testKickApi() {
  try {
    console.log('📡 Testing KICK API...');
    const response = await fetch('https://kick.com/api/v2/channels/trainwreckstv');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ KICK API responded successfully');
    console.log('Channel ID:', data.id);
    console.log('Chatroom ID:', data.chatroom?.id);
    console.log('Username:', data.user?.username);
    console.log('Live Status:', data.livestream ? 'Live' : 'Offline');
    
    return data;
  } catch (error) {
    console.error('❌ KICK API test failed:', error.message);
    throw error;
  }
}

testKickApi().catch(console.error);
