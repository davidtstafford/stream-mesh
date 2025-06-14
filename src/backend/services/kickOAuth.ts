// KICK OAuth handler for Electron using Authorization Code + PKCE flow
import { BrowserWindow, session } from 'electron';
import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';

// Public client configuration - client_secret injected at build time
const CLIENT_ID = '01JXMTP4GNFCM5YJG5EDPSBWMB';
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET || ''; // Injected during build
const OAUTH_PORT = 3301;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/auth/kick/callback`;

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export interface KickTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Clear KICK session data
export function clearKickSession(): Promise<void> {
  return new Promise((resolve) => {
    const defaultSession = session.defaultSession;
    const kickSession = session.fromPartition('persist:kick-oauth');
    
    // Clear both default session and kick-oauth partition
    Promise.all([
      // Clear default session
      defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage'],
        quotas: ['temporary'],
        origin: 'https://kick.com'
      }),
      // Clear kick-oauth partition completely
      kickSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage'],
        quotas: ['temporary']
      })
    ]).then(() => {
      console.log('KICK session data cleared (both default and oauth partition)');
      resolve();
    }).catch((err) => {
      console.error('Failed to clear KICK session data:', err);
      resolve(); // Don't fail the disconnect process
    });
  });
}

export function startKickOAuth(mainWindow: BrowserWindow, credentials: { client_id: string, client_secret: string }): Promise<KickTokenResponse> {
  return new Promise((resolve, reject) => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    let authTimeout: NodeJS.Timeout;
    
    // KICK OAuth URL - using the correct id.kick.com domain and user-provided client_id
    const OAUTH_URL = `https://id.kick.com/oauth/authorize?` +
      `client_id=${credentials.client_id}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=user%3Aread+channel%3Aread+channel%3Awrite+chat%3Awrite+streamkey%3Aread+events%3Asubscribe&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256&` +
      `state=${crypto.randomUUID()}`;

    // Start a local HTTP server to listen for the OAuth redirect
    const server = http.createServer(async (req, res) => {
      const reqUrl = url.parse(req.url || '', true);
      console.log('KICK OAuth callback received:', reqUrl.pathname, reqUrl.query);
      
      if (reqUrl.pathname === '/auth/kick/callback') {
        const code = reqUrl.query.code as string;
        const error = reqUrl.query.error as string;
        
        if (error) {
          console.log('KICK OAuth error received:', error);
          clearTimeout(authTimeout);
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html>
<html>
<head>
  <title>KICK Authentication Failed</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      background: #0a0a0a; 
      color: white; 
      padding: 40px; 
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 30px;
      background: #1a1a1a;
      border-radius: 8px;
      border: 2px solid #f53838;
    }
    h2 { color: #f53838; margin-bottom: 20px; }
    p { margin-bottom: 30px; line-height: 1.5; }
    .error { color: #ff6b6b; font-weight: bold; }
    button {
      background: #53fc18;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover { background: #45d614; }
  </style>
</head>
<body>
  <div class="container">
    <h2>❌ Authentication Failed</h2>
    <p>There was an error with KICK authentication:</p>
    <p class="error">${error}</p>
    <p>Please close this window and try again.</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    setTimeout(() => {
      try { window.close(); } catch(e) { 
        document.body.innerHTML = '<div class="container"><h2>Please close this window manually</h2></div>'; 
      }
    }, 5000);
  </script>
</body>
</html>`);
          reject(new Error(`OAuth error: ${error}`));
          server.close();
          return;
        }
        
        if (code) {
          console.log('KICK OAuth code received, exchanging for token...');
          try {
            // Exchange authorization code for access token
            const tokenResponse = await exchangeCodeForToken(code, codeVerifier, credentials);
            console.log('KICK token exchange successful');
            
            clearTimeout(authTimeout);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
<html>
<head>
  <title>KICK Authentication Complete</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      background: #0a0a0a; 
      color: white; 
      padding: 40px; 
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 30px;
      background: #1a1a1a;
      border-radius: 8px;
      border: 2px solid #53fc18;
    }
    h2 { color: #53fc18; margin-bottom: 20px; }
    p { margin-bottom: 30px; line-height: 1.5; }
    button {
      background: #53fc18;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover { background: #45d614; }
  </style>
</head>
<body>
  <div class="container">
    <h2>✅ Authentication Complete</h2>
    <p>KICK authentication was successful! You can now close this window and return to Stream Mesh.</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    // Auto-close after 3 seconds if manual close doesn't work
    setTimeout(() => {
      try { window.close(); } catch(e) { 
        document.body.innerHTML = '<div class="container"><h2>Please close this window manually</h2></div>'; 
      }
    }, 3000);
  </script>
</body>
</html>`);
            
            resolve(tokenResponse);
            server.close();
          } catch (error) {
            console.error('KICK token exchange failed:', error);
            clearTimeout(authTimeout);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
<html>
<head>
  <title>KICK Authentication Failed</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      background: #0a0a0a; 
      color: white; 
      padding: 40px; 
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 30px;
      background: #1a1a1a;
      border-radius: 8px;
      border: 2px solid #f53838;
    }
    h2 { color: #f53838; margin-bottom: 20px; }
    p { margin-bottom: 30px; line-height: 1.5; }
    button {
      background: #53fc18;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover { background: #45d614; }
  </style>
</head>
<body>
  <div class="container">
    <h2>❌ Authentication Failed</h2>
    <p>Failed to exchange authorization code for access token.</p>
    <p>Please close this window and try again.</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    setTimeout(() => {
      try { window.close(); } catch(e) { 
        document.body.innerHTML = '<div class="container"><h2>Please close this window manually</h2></div>'; 
      }
    }, 5000);
  </script>
</body>
</html>`);
            reject(error);
            server.close();
          }
        } else {
          console.log('KICK OAuth: No code or error received');
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html>
<html>
<head>
  <title>KICK Authentication Failed</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      background: #0a0a0a; 
      color: white; 
      padding: 40px; 
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 30px;
      background: #1a1a1a;
      border-radius: 8px;
      border: 2px solid #f53838;
    }
    h2 { color: #f53838; margin-bottom: 20px; }
    p { margin-bottom: 30px; line-height: 1.5; }
    button {
      background: #53fc18;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover { background: #45d614; }
  </style>
</head>
<body>
  <div class="container">
    <h2>❌ Authentication Failed</h2>
    <p>No authorization code received from KICK.</p>
    <p>Please close this window and try again.</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    setTimeout(() => {
      try { window.close(); } catch(e) { 
        document.body.innerHTML = '<div class="container"><h2>Please close this window manually</h2></div>'; 
      }
    }, 5000);
  </script>
</body>
</html>`);
        }
      } else {
        console.log('KICK OAuth: Unknown callback path:', reqUrl.pathname);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <title>KICK OAuth - Page Not Found</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      background: #0a0a0a; 
      color: white; 
      padding: 40px; 
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 30px;
      background: #1a1a1a;
      border-radius: 8px;
      border: 2px solid #f53838;
    }
    h2 { color: #f53838; margin-bottom: 20px; }
    p { margin-bottom: 30px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <h2>404 - Page Not Found</h2>
    <p>Path: ${reqUrl.pathname}</p>
    <p>This is the KICK OAuth callback server.</p>
  </div>
</body>
</html>`);
      }
    });
    
    server.listen(OAUTH_PORT, () => {
      console.log(`KICK OAuth server listening on port ${OAUTH_PORT}`);
      console.log(`KICK OAuth URL: ${OAUTH_URL}`);
      
      // Wait a moment to ensure server is ready
      setTimeout(() => {
        // Open the OAuth URL in a new BrowserWindow
        const authWin = new BrowserWindow({
          width: 500,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'persist:kick-oauth', // Use separate session partition
          },
          parent: mainWindow,
          modal: false,  // Remove modal to allow close button
          show: true,
          title: 'KICK Authentication',
          minimizable: false,
          maximizable: false,
          resizable: false,
          alwaysOnTop: true,
          closable: true,  // Explicitly enable close button
          autoHideMenuBar: true,  // Hide menu bar for cleaner look
        });
        
        authWin.loadURL(OAUTH_URL);
        console.log('KICK OAuth window opened');
        
        // Add debugging for the window navigation
        authWin.webContents.on('did-navigate', (event, url) => {
          console.log('KICK OAuth window navigated to:', url);
        });
        
        authWin.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
          console.log('KICK OAuth window failed to load:', errorCode, errorDescription, validatedURL);
        });
        
        authWin.webContents.on('did-finish-load', () => {
          console.log('KICK OAuth window finished loading');
          const currentURL = authWin.webContents.getURL();
          console.log('Current URL:', currentURL);
        });
        
        // Add timeout to prevent hanging
        authTimeout = setTimeout(() => {
          console.log('KICK OAuth timeout - closing window');
          authWin.close();
          server.close();
          reject(new Error('OAuth timeout - no response received'));
        }, 300000); // 5 minute timeout
        
        // Fallback: if the user closes the window
        authWin.on('closed', () => {
          console.log('KICK OAuth window closed by user');
          clearTimeout(authTimeout);
          server.close();
          reject(new Error('User closed the OAuth window'));
        });
      }, 500); // Wait 500ms for server to be ready
    });
    
    server.on('error', (err) => {
      console.error('KICK OAuth server error:', err);
      reject(err);
    });
  });
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string, codeVerifier: string, credentials: { client_id: string, client_secret: string }): Promise<KickTokenResponse> {
  const tokenParams: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  };
  
  console.log('KICK token exchange request params:', { ...tokenParams, client_secret: '[REDACTED]' });

  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams(tokenParams),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('KICK token exchange error details:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      requestParams: { ...tokenParams, client_secret: '[REDACTED]' }
    });
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Refresh access token
export async function refreshKickToken(refreshToken: string, credentials: { client_id: string, client_secret: string }): Promise<KickTokenResponse> {
  const response = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: refreshToken,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Validate token and get user info
export async function validateKickToken(accessToken: string): Promise<any> {
  const response = await fetch('https://api.kick.com/public/v1/channels', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Token validation failed: ${response.status}`);
  }
  
  return await response.json();
}
