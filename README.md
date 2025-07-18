## Updating StreamMesh to the Latest Version

If you want to update StreamMesh to the latest version after changes have been made:

1. Open Terminal (macOS) or Command Prompt (Windows).
2. Navigate to your `stream-mesh` folder:
   ```sh
   cd stream-mesh
   ```
3. Pull the latest code and update dependencies:
   ```sh
   git pull
   npm install
   npm run build && npm start
   ```
4. The app will relaunch with the latest updates.

**Note:** All commands should work without `sudo` if you installed Node.js and Homebrew as a normal user. If you see a permissions error, you may need to fix your Homebrew or Node.js setup, but this is rare.
# Stream Mesh

StreamMesh is a Windows desktop application for streamers, built with Electron, React, and Node.js (TypeScript). It features a modern UI, local SQLite storage, and AWS Polly integration for TTS. All user data is stored locally. The app supports light, dark, and system themes (dark by default). Manual updates only. Packaged as an MSI/EXE installer for Windows 10+.


## Features
- Navigation bar with collapsible sections
- Link to Streams (Twitch, TikTok placeholder)
- Live Chat and Chat History
- Admin: Preferences, TTS, Viewer Management
- Commands: System and Custom (coming soon)
- Local SQLite database
- AWS Polly TTS integration

### New: Disable Neural Voices (Cost-Saving Option)

- **Location:** TTS admin screen (Settings)
- **Description:** Adds a checkbox to disable neural voices, with a brief explanation about AWS Polly costs.
- **Effect when enabled:**
  - Neural voices are hidden from all voice selection lists (TTS and Viewers screens).
  - The backend will never use neural voices. If a neural voice is requested (including for users who previously selected one), the system will automatically fall back to Standard Brian.
- **Purpose:** Helps users avoid higher AWS Polly costs by restricting all TTS to standard voices only.

**How to use:**  
Go to the TTS settings, check "Disable neural voices," and save. All voice selection and playback will now use only standard voices.

## Getting Started

## Running StreamMesh Locally (Mac & Windows)

You can run StreamMesh directly from source on both macOS and Windows. No programming experience is required, but you will need to install a few free tools first.

### 1. Install Prerequisites

#### macOS
- **Homebrew** (if not already installed):
  - Open Terminal and run:
    ```sh
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
- **Git**:
  - In Terminal, run:
    ```sh
    brew install git
    ```
- **Node.js (LTS version)**:
  - In Terminal, run:
    ```sh
    brew install node
    ```

#### Windows
- **Git for Windows**: [Download here](https://git-scm.com/download/win) and install.
- **Node.js (LTS version)**: [Download here](https://nodejs.org/) and install.

### 2. Download StreamMesh

Open Terminal (macOS) or Command Prompt (Windows), then run:
```sh
git clone https://github.com/davidtstafford/stream-mesh.git
cd stream-mesh
```

### 3. Install Dependencies

In the `stream-mesh` folder, run:
```sh
npm install
```

### 4. Start the App

In the same folder, run:
```sh
npm run build && npm start
```

The app will open in a new window. You can now use StreamMesh as normal.

### 5. First-Time Setup

1. Go to the TTS section in the app and enter your AWS Polly credentials (see in-app help for details).
2. Connect your Twitch account if desired.
3. Add the TTS overlay URL to OBS as a browser source (see OBS section in the app for the correct URL).

---

**Troubleshooting:**
- If you see errors about missing dependencies, make sure you ran `npm install` in the correct folder.
- If you have issues with permissions, try running your terminal as administrator (Windows) or with `sudo` (macOS, only if needed).

**You do NOT need to install an IDE or any programming tools beyond the above.**

## Development
- Frontend: React + TypeScript
- Backend: Node.js + TypeScript
- Bundled with Electron

## License
MIT
