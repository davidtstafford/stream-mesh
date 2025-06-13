// Twitch OAuth handler for Electron
import { BrowserWindow, shell } from 'electron';
import * as http from 'http';
import * as url from 'url';

const CLIENT_ID = 'cboarqiyyeps1ew3f630aimpj6d8wf';
const OAUTH_PORT = 3300;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/auth/twitch/callback`;
const OAUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=chat:read+chat:edit`;

export function startTwitchOAuth(mainWindow: BrowserWindow): Promise<string> {
  return new Promise((resolve, reject) => {
    // Start a local HTTP server to listen for the OAuth redirect
    const server = http.createServer((req, res) => {
      const reqUrl = url.parse(req.url || '', true);
      if (reqUrl.pathname === '/auth/twitch/callback') {
        // The access token is in the URL fragment, not query, so we need to instruct the user to copy it
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Twitch Authentication Complete</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      background: #0f0f23; 
      color: white; 
      padding: 40px; 
      margin: 0;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 30px;
      background: #18181b;
      border-radius: 8px;
      border: 2px solid #9147ff;
    }
    h2 { color: #9147ff; margin-bottom: 20px; }
    p { margin-bottom: 30px; line-height: 1.5; }
    button {
      background: #9147ff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover { background: #772ce8; }
  </style>
</head>
<body>
  <div class="container">
    <h2>✅ Authentication Complete</h2>
    <p>Twitch authentication was successful! You can now close this window and return to Stream Mesh.</p>
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
        // We can't get the fragment from the server, so we need to get it from the browser window
        // We'll use a custom protocol in the Electron window to intercept it
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(OAUTH_PORT);

    // Open the OAuth URL in a new BrowserWindow
    const authWin = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      parent: mainWindow,
      modal: false,  // Remove modal to allow close button
      show: true,
      title: 'Twitch Authentication',
      minimizable: false,
      maximizable: false,
      resizable: false,
      alwaysOnTop: true,
      closable: true,  // Explicitly enable close button
      autoHideMenuBar: true,  // Hide menu bar for cleaner look
    });
    authWin.loadURL(OAUTH_URL);

    // Listen for redirects to the callback URL
    authWin.webContents.on('will-redirect', (event, newUrl) => {
      if (newUrl.startsWith(REDIRECT_URI)) {
        // The access token is in the fragment: #access_token=...&...
        const hashIndex = newUrl.indexOf('#');
        if (hashIndex !== -1) {
          const hash = newUrl.substring(hashIndex + 1);
          const params = new url.URLSearchParams(hash);
          const accessToken = params.get('access_token');
          if (accessToken) {
            resolve(accessToken);
            authWin.close();
            server.close();
          }
        }
      }
    });
    // Also handle did-navigate for some OAuth flows
    authWin.webContents.on('did-navigate', (_event, newUrl) => {
      if (newUrl.startsWith(REDIRECT_URI)) {
        const hashIndex = newUrl.indexOf('#');
        if (hashIndex !== -1) {
          const hash = newUrl.substring(hashIndex + 1);
          const params = new url.URLSearchParams(hash);
          const accessToken = params.get('access_token');
          if (accessToken) {
            resolve(accessToken);
            authWin.close();
            server.close();
          }
        }
      }
    });
    // Fallback: if the user closes the window
    authWin.on('closed', () => {
      server.close();
      reject(new Error('User closed the OAuth window'));
    });
  });
}
