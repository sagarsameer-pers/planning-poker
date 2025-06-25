#!/usr/bin/env node

// Simple startup script for Render deployment
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Planning Poker Backend...');
console.log('📁 Changing to server directory...');

// Change to server directory and start the application
const serverPath = path.join(__dirname, 'server');
process.chdir(serverPath);

console.log('📍 Current directory:', process.cwd());
console.log('🎯 Starting server...');

// Start the server
const server = spawn('node', ['index.js'], {
  stdio: 'inherit',
  cwd: serverPath
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🔚 Server process exited with code ${code}`);
  process.exit(code);
}); 