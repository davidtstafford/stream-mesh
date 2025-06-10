// Main entry point wrapper to ensure CommonJS loading
'use strict';

// Set environment variables to force CommonJS mode
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --loader=./dist/loader.js';

// Force CommonJS module resolution
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  // Handle any problematic module resolutions here
  if (request.startsWith('electron:')) {
    // Strip the electron: protocol if it appears
    request = request.replace('electron:', '');
  }
  
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Load the actual main process
require('./main.js');
