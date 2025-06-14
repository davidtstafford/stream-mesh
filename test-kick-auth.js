// Test script to verify KICK authentication and API endpoints
const fs = require('fs');
const path = require('path');

async function testKickAuth() {
  try {
    // Load stored KICK auth
    const authPath = path.join(process.env.HOME, '.streammesh', 'kick-auth.json');
    
    if (!fs.existsSync(authPath)) {
      console.log('❌ No KICK auth file found. Please authenticate first.');
      return;
    }
    
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    console.log('✅ KICK auth file found for user:', authData.username);
    console.log('🕐 Token expires at:', new Date(authData.expiresAt).toISOString());
    console.log('⏰ Current time:', new Date().toISOString());
    console.log('🔄 Token expired?', Date.now() >= authData.expiresAt);
    
    // Test different API endpoints
    const endpoints = [
      'https://kick.com/api/v1/user',
      'https://kick.com/api/v2/user', 
      'https://kick.com/api/user',
      'https://kick.com/api/v1/channels',
      'https://kick.com/api/v2/channels',
      `https://kick.com/api/v1/channels/${authData.username}`,
      `https://kick.com/api/v2/channels/${authData.username}`,
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authData.accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'Stream Mesh/1.0.0',
          },
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`   ✅ SUCCESS - JSON response received`);
            console.log(`   📄 Response keys:`, Object.keys(data));
          } else {
            const text = await response.text();
            console.log(`   ❌ Non-JSON response:`, text.substring(0, 100) + '...');
          }
        } else {
          const text = await response.text();
          console.log(`   ❌ Error:`, text.substring(0, 100) + '...');
        }
      } catch (error) {
        console.log(`   💥 Exception:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing KICK auth:', error);
  }
}

testKickAuth();
