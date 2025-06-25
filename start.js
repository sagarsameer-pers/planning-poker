#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Planning Poker Server...');
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

// Check if we're in the right directory structure
const serverDir = path.join(__dirname, 'server');
const serverIndexPath = path.join(serverDir, 'index.js');
const rootIndexPath = path.join(__dirname, 'server', 'index.js');

console.log('🔍 Looking for server files...');
console.log('📄 Server index.js path:', serverIndexPath);
console.log('📄 Server index.js exists:', fs.existsSync(serverIndexPath));

// Method 1: Try to run from server directory (preferred)
if (fs.existsSync(serverIndexPath)) {
    console.log('✅ Found server/index.js - starting server...');
    
    // Change to server directory for proper module resolution
    process.chdir(serverDir);
    console.log('📁 Changed working directory to:', process.cwd());
    
    // Require the server
    try {
        require('./index.js');
        console.log('🎉 Server started successfully!');
    } catch (error) {
        console.error('❌ Error starting server from server directory:', error.message);
        
        // Fallback: try from root with full path
        console.log('🔄 Trying fallback method...');
        process.chdir(__dirname);
        require(serverIndexPath);
    }
} else {
    console.error('❌ Could not find server/index.js');
    console.error('📁 Directory contents:', fs.readdirSync(__dirname));
    process.exit(1);
} 