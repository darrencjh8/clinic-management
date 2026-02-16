# Stage 1: Build the UI
FROM node:18-alpine AS builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
# Environment handling for production build:
# 1. Remove any accidental .env file from COPY ui/. command
# 2. Copy .env-prod to .env so Vite uses production values
# 3. Vite bakes these values into the bundle at build time
# 4. No runtime environment files needed
RUN rm -f ./.env || true
COPY ui/.env-prod ./.env
RUN npm run build

# Stage 2: Setup the Server and Run
FROM node:18-alpine
WORKDIR /app

# Copy server dependencies and install
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --production

# Copy server code
COPY server/ ./

# Copy built UI assets from builder stage to server's public directory
COPY --from=builder /app/ui/dist ./public

# Expose the port
ENV PORT=3000
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
