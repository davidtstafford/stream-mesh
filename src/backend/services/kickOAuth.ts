// KICK OAuth handler for Electron using Authorization Code + PKCE flow
import { BrowserWindow, session } from 'electron';
import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';

const CLIENT_ID = '01JXMTP4GNFCM5YJG5EDPSBWMB';
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

export function startKickOAuth(mainWindow: BrowserWindow): Promise<KickTokenResponse> {
  return new Promise((resolve, reject) => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    
    // KICK OAuth URL with PKCE
    const OAUTH_URL = `https://kick.com/oauth2/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=chat:read+chat:write+user:read+channel:read&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256&` +
      `state=${crypto.randomUUID()}`;

    // Start a local HTTP server to listen for the OAuth redirect
    const server = http.createServer(async (req, res) => {
      const reqUrl = url.parse(req.url || '', true);
      
      if (reqUrl.pathname === '/auth/kick/callback') {
        const code = reqUrl.query.code as string;
        const error = reqUrl.query.error as string;
        
        if (error) {
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
          try {
            // Exchange authorization code for access token
            const tokenResponse = await exchangeCodeForToken(code, codeVerifier);
            
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
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    server.listen(OAUTH_PORT, () => {
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
      
      // Fallback: if the user closes the window
      authWin.on('closed', () => {
        server.close();
        reject(new Error('User closed the OAuth window'));
      });
    });
    
    server.on('error', (err) => {
      reject(err);
    });
  });
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<KickTokenResponse> {
  const response = await fetch('https://kick.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Refresh access token
export async function refreshKickToken(refreshToken: string): Promise<KickTokenResponse> {
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

// Validate token and get user info
export async function validateKickToken(accessToken: string): Promise<any> {
  const response = await fetch('https://kick.com/api/v2/user', {
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
