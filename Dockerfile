# Stage 1: Build the UI
FROM node:18-alpine AS builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
# Environment handling for build:
# 1. Remove any accidental .env file from COPY ui/. command
# 2. Use ENV_FILE build arg to determine which env file to use (default: .env-prod)
# 3. Copy specified env file to .env so Vite uses the correct values
# 4. Vite bakes these values into the bundle at build time
ARG ENV_FILE=.env-prod
RUN rm -f ./.env || true
COPY ui/${ENV_FILE} ./.env
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
