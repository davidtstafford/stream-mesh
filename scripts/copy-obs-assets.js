// Copy OBS overlay assets from src/ui/assets to dist/backend/ui/assets after build
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/ui/assets');
const destDir = path.join(__dirname, '../dist/backend/ui/assets');
const filesToCopy = ['chatoverlay.html', 'chatoverlay.js', 'ttsoverlay.html', 'ttsoverlay.js'];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.warn(`Source file not found: ${src}`);
  }
}
