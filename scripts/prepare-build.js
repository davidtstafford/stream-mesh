// Pre-build script to ensure CommonJS compatibility
const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing build for CommonJS compatibility...');

// Ensure the dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('📁 Created dist directory');
}

// Create a package.json in dist to force CommonJS
const distPackageJson = {
  "type": "commonjs",
  "main": "main.js"
};

try {
  fs.writeFileSync(
    path.join(distDir, 'package.json'), 
    JSON.stringify(distPackageJson, null, 2)
  );
  console.log('✅ Created dist/package.json with CommonJS type');
} catch (error) {
  console.error('❌ Failed to create dist/package.json:', error.message);
}

console.log('✅ Build preparation complete');
