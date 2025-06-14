// One-time setup script to securely store KICK OAuth credentials
import { secretsManager } from './secretsManager';

/**
 * Initialize secure storage with KICK OAuth credentials
 * This should be run once during development setup
 */
export async function setupKickSecrets(): Promise<void> {
  const masterPassword = 'stream-mesh-dev-key-2025'; // In production, this should be user-provided or environment-based
  
  // Initialize the secrets manager
  secretsManager.initialize(masterPassword);
  
  // Store KICK OAuth credentials securely
  // Note: These values are automatically populated during initial setup
  // and should be updated with your actual KICK OAuth application credentials
  const secureConfig = {
    kick: {
      clientId: process.env.KICK_CLIENT_ID || '01JXMTP4GNFCM5YJG5EDPSBWMB',
      clientSecret: process.env.KICK_CLIENT_SECRET || 'a336c9659db06628e2a70a19b9507fe03db473c161e3e767ca8162ffff47c1e1'
    }
  };
  
  await secretsManager.saveSecureConfig(secureConfig);
  console.log('✅ KICK OAuth credentials stored securely');
}

/**
 * Test loading the secure configuration
 */
export async function testSecureConfig(): Promise<void> {
  const masterPassword = 'stream-mesh-dev-key-2025';
  secretsManager.initialize(masterPassword);
  
  const kickCreds = await secretsManager.getKickCredentials();
  if (kickCreds) {
    console.log('✅ Successfully loaded KICK credentials');
    console.log('Client ID:', kickCreds.clientId);
    console.log('Client Secret:', kickCreds.clientSecret.substring(0, 10) + '...');
  } else {
    console.log('❌ Failed to load KICK credentials');
  }
}
