# Stream Mesh Build & Configuration Guide

## Building Stream Mesh with KICK Support

Stream Mesh includes full dual-platform support for both Twitch and KICK streaming platforms.

### Prerequisites

#### System Requirements
- **Node.js** 18.x or higher (LTS recommended)
- **NPM** 8.x or higher
- **Git** for version control
- **Python** 3.x (for native module compilation)

#### Operating System Support
- **macOS** 10.14 or higher
- **Windows** 10 or higher
- **Linux** Ubuntu 18.04+ (experimental)

### Build Process

#### 1. Clone and Setup
```bash
git clone https://github.com/davidtstafford/stream-mesh.git
cd stream-mesh
npm install
```

#### 2. Development Build
```bash
npm run build        # Build all components
npm start           # Start development server
```

#### 3. Production Build
```bash
npm run dist        # Build distributables for current platform
npm run dist:mac    # Build for macOS
npm run dist:win    # Build for Windows
npm run dist:all    # Build for all platforms
```

### Platform Configuration

#### Twitch Configuration
Stream Mesh uses standard Twitch API integration:

- **OAuth Scopes:** `chat:read`, `chat:edit`, `channel:moderate`, `whispers:read`, `whispers:edit`
- **Redirect URL:** `http://localhost:3300/auth/twitch/callback`
- **Connection:** TMI.js for IRC-based chat

#### KICK Configuration  
Stream Mesh includes KICK integration with the following setup:

**OAuth Configuration:**
- **Client ID:** `01JXMTP4GNFCM5YJG5EDPSBWMB`
- **Redirect URL:** `http://localhost:3301/auth/kick/callback`
- **OAuth Port:** 3301 (different from Twitch's 3300)
- **Scopes:** User info, stream key, channel info, chat feed, events

**Required Permissions:**
- ✅ Read user information (including email address)
- ✅ Read stream key  
- ✅ Read channel information
- ✅ Write to Chat feed
- ✅ Subscribe to events (read chat feed, follows, subscribes, gifts)

### Environment Configuration

#### Development Environment
Create a `.env` file in the project root:

```bash
# Twitch Configuration
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# KICK Configuration  
KICK_CLIENT_ID=01JXMTP4GNFCM5YJG5EDPSBWMB
KICK_CLIENT_SECRET=your_kick_client_secret

# AWS Polly (Optional - can be configured in-app)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Development Options
NODE_ENV=development
DEBUG_MODE=true
```

#### Production Environment
For production builds, sensitive credentials are handled through:

1. **In-App Configuration** - Users enter their own API keys
2. **Secure Storage** - Credentials encrypted with user-specific keys
3. **Local-Only** - No credentials sent to external servers

### Database Configuration

Stream Mesh uses SQLite for local data storage:

#### Database Location
- **Development:** `./data/streammesh.db`
- **Production (Windows):** `%APPDATA%\StreamMesh\data\`
- **Production (macOS):** `~/Library/Application Support/StreamMesh/data/`

#### Schema Updates
The database schema automatically updates for dual-platform support:

```sql
-- Platform-specific viewer keys
CREATE TABLE IF NOT EXISTS viewers (
    viewerKey TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    -- ... other fields
);

-- Cross-platform events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    type TEXT NOT NULL,
    -- ... other fields
);
```

### Feature Configuration

#### TTS Configuration
Text-to-Speech works across both platforms:

- **Engine:** Amazon Polly
- **Voice Selection:** Per-user, cross-platform
- **Queue Management:** Unified queue for both platforms
- **Commands:** `~setvoice`, `~voices`, `~myvoice` work on both platforms

#### Event System
Events are processed uniformly across platforms:

**Twitch Events:**
- `chat`, `follow`, `subscription`, `resub`, `subgift`, `cheer`, `raid`, `host`, `redeem`

**KICK Events:**
- `chat.message.sent`, `channel.followed`, `channel.subscription.new`, `channel.subscription.renewal`, `channel.subscription.gifts`, `moderation.banned`

#### Command System
Commands work identically across platforms:

- **System Commands:** `~voices`, `~setvoice`, `~myvoice`, `~help`
- **Moderation:** Platform-specific permissions respected
- **Cross-Platform:** Responses sent to originating platform

### Development Configuration

#### File Structure
```
src/
├── backend/
│   ├── services/
│   │   ├── platformIntegration.ts    # Main platform service
│   │   ├── kickApi.ts               # KICK API service
│   │   ├── kickOAuth.ts             # KICK authentication
│   │   ├── kickWebSocket.ts         # KICK WebSocket (future)
│   │   └── commandProcessor.ts       # Cross-platform commands
│   └── core/
├── ui/
│   ├── screens/
│   │   ├── LinkToStreams.tsx        # Platform connections
│   │   ├── Developer.tsx            # Twitch dev tools
│   │   ├── DeveloperKick.tsx        # KICK dev tools
│   │   └── EventHistory.tsx         # Cross-platform events
│   └── components/
└── shared/
```

#### TypeScript Configuration
Key type definitions for dual-platform support:

```typescript
// Platform type union
export type Platform = 'twitch' | 'kick';

// Authentication interfaces
export interface TwitchAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

export interface KickAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
  userId: string;
}

// Event system
export interface StreamEvent {
  type: string;
  platform: Platform;
  user: string;
  // ... other fields
}
```

### Build Optimization

#### Bundle Size Optimization
- **Code Splitting:** Platform-specific code loaded on demand
- **Tree Shaking:** Unused platform code excluded
- **Asset Optimization:** Platform assets bundled separately

#### Performance Optimization
- **Memory Management:** Efficient event processing for dual platforms
- **Database Indexing:** Optimized queries for cross-platform data
- **UI Optimization:** Virtual scrolling for high-volume event lists

### Testing Configuration

#### Unit Testing
```bash
npm test                    # Run all tests
npm run test:integration   # Run integration tests
npm run test:platforms     # Test platform-specific code
```

#### Integration Testing
Stream Mesh includes comprehensive integration tests:

- **Dual-Platform Connection** - Both platforms simultaneously
- **Cross-Platform Events** - Event correlation and processing
- **Database Integrity** - Multi-platform data storage
- **Performance Testing** - Memory and response time validation

#### Manual Testing
Use the built-in developer tools:

1. **Developer > Twitch** - Simulate Twitch events
2. **Developer > KICK** - Simulate KICK events  
3. **Admin > Events** - Configure cross-platform event display
4. **Admin > Viewers** - Test cross-platform viewer management

### Deployment Configuration

#### Electron Builder Configuration
The app uses Electron Builder for creating distributables:

```json
{
  "build": {
    "appId": "com.streammesh.app",
    "productName": "Stream Mesh",
    "files": [
      "dist/**/*",
      "src/ui/assets/**/*",
      "!node_modules/**/{test,spec,docs}/**/*"
    ],
    "extraMetadata": {
      "main": "dist/main.js"
    }
  }
}
```

#### Platform-Specific Builds
- **Windows:** MSI and EXE installers
- **macOS:** DMG and PKG installers
- **Linux:** AppImage and DEB packages (experimental)

### Troubleshooting Build Issues

#### Common Build Problems

1. **Node Version Conflicts**
   ```bash
   nvm use 18              # Use Node.js 18.x
   npm install             # Reinstall dependencies
   ```

2. **Python/Native Module Issues**
   ```bash
   npm install --python=python3
   npm rebuild
   ```

3. **Platform-Specific Dependencies**
   ```bash
   npm install --platform=win32    # Windows
   npm install --platform=darwin   # macOS
   ```

#### Debug Build Issues
```bash
npm run build -- --verbose        # Verbose build output
npm run build-main -- --listFiles # List compiled files
```

### Security Configuration

#### OAuth Security
- **PKCE Flow:** Used for KICK OAuth for enhanced security
- **Token Storage:** Encrypted local storage only
- **Refresh Tokens:** Automatic refresh with secure storage

#### Data Privacy
- **Local Storage:** All user data stored locally
- **No Telemetry:** No usage data sent to external servers
- **Credential Isolation:** Platform credentials stored separately

---

*This configuration guide ensures proper setup of Stream Mesh with full dual-platform support for Twitch and KICK streaming.*
