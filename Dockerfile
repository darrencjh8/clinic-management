# Stage 1: Build the UI
FROM node:18-alpine AS builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
# Environment handling for build:
# 1. Remove any accidental .env file from COPY ui/. command
# 2. Accept build arguments for environment variables
# 3. Create .env from build arguments for Vite build
# 4. Vite bakes these values into the bundle at build time
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_CLIENT_SECRET
ARG VITE_CLINIC_NAME
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

RUN rm -f ./.env || true
RUN echo "VITE_API_URL=${VITE_API_URL}" > ./.env && \
    echo "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" >> ./.env && \
    echo "VITE_CLIENT_SECRET=${VITE_CLIENT_SECRET}" >> ./.env && \
    echo "VITE_CLINIC_NAME=${VITE_CLINIC_NAME}" >> ./.env && \
    echo "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}" >> ./.env && \
    echo "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}" >> ./.env && \
    echo "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}" >> ./.env && \
    echo "VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}" >> ./.env && \
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}" >> ./.env && \
    echo "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}" >> ./.env
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
