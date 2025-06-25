#!/bin/bash

# Deployment script for Planning Poker Backend
echo "🚀 Starting Planning Poker Backend deployment..."

# Navigate to server directory
cd server

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server
echo "🎯 Starting server..."
npm start 