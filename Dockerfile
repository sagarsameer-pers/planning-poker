# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory to server
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./

# Create data directory for SQLite
RUN mkdir -p /app/server/data

# Expose port
EXPOSE 10000

# Set environment variable for port
ENV PORT=10000

# Start the application
CMD ["npm", "start"] 