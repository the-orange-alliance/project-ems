# ---------- 1. Base builder stage ----------
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ bash

# Align npm version to repo's declared one
RUN npm i -g npm@11.6.1

WORKDIR /workspace

# Copy core manifests first (to leverage Docker caching)
COPY package*.json ./
COPY turbo.json ./

# Copy workspace manifests
COPY libs/models/package.json ./libs/models/
COPY libs/client/package.json ./libs/client/
COPY libs/server/package.json ./libs/server/
COPY apps/services/api/package.json ./apps/services/api/
COPY apps/services/api-amplify/package.json ./apps/services/api-amplify/
COPY apps/services/frc-fms/package.json ./apps/services/frc-fms/
COPY apps/services/realtime/package.json ./apps/services/realtime/
COPY apps/web/package.json ./apps/web/

# Copy full source (needed for file: links)
COPY libs/ ./libs/
COPY apps/ ./apps/

# Install all dependencies with workspace support
RUN npm ci --workspaces --include-workspace-root

# Build libraries first
RUN npm run build:libs

# Build backend and frontend workspaces
RUN npm run build --workspace=api
RUN npm run build --workspace=realtime
RUN npm run build --workspace=ems-web


# ---------- 2. Backend runtime image ----------
FROM node:20-alpine AS backend

WORKDIR /workspace
ENV NODE_ENV=production

# Copy node_modules and built files from builder
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/libs ./libs
COPY --from=builder /workspace/apps/services/api/build ./apps/services/api/build
COPY --from=builder /workspace/apps/services/realtime/build ./apps/services/realtime/build
COPY --from=builder /workspace/apps/services/api/package.json ./apps/services/api/
COPY --from=builder /workspace/apps/services/realtime/package.json ./apps/services/realtime/

# Expose backend ports
EXPOSE 8080
EXPOSE 8081

# Start both API and Realtime servers concurrently
CMD ["sh", "-c", "node apps/services/api/build/Server.js & node apps/services/realtime/build/Server.js & wait"]


# ---------- 3. Web runtime image ----------
FROM node:20-alpine AS web

# Install serve globally for static hosting (could use nginx instead)
RUN npm install -g serve@14.2.1

WORKDIR /workspace

# Copy built frontend from builder
COPY --from=builder /workspace/apps/web/dist ./apps/web/dist

# Expose the Vite/Serve port
EXPOSE 80

# Serve the built frontend
CMD ["serve", "-s", "apps/web/dist", "-l", "80"]
