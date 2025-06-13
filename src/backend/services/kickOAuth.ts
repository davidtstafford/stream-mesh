// KICK OAuth handler for Electron using Authorization Code + PKCE flow
import { BrowserWindow } from 'electron';
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
          res.end(`<html><body><h2>Authentication failed</h2><p>Error: ${error}</p><script>window.close();</script></body></html>`);
          reject(new Error(`OAuth error: ${error}`));
          server.close();
          return;
        }
        
        if (code) {
          try {
            // Exchange authorization code for access token
            const tokenResponse = await exchangeCodeForToken(code, codeVerifier);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<html><body><h2>Authentication complete</h2><p>You may now close this window and return to StreamMesh.</p><script>window.close();</script></body></html>`);
            
            resolve(tokenResponse);
            server.close();
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<html><body><h2>Authentication failed</h2><p>Failed to exchange code for token</p><script>window.close();</script></body></html>`);
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
        },
        parent: mainWindow,
        modal: true,
        show: true,
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
