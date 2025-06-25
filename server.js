// Simple server entry point for Render deployment
const path = require('path');

// Change to server directory
process.chdir(path.join(__dirname, 'server'));

// Start the server
require('./server/index.js'); 