# ---------- 1. Base Stage ----------
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ bash
RUN npm i -g npm@11.6.2 turbo
WORKDIR /workspace

# ---------- 2. Build Stage ----------
FROM base AS build

# Copy only package manifests first for caching
COPY package*.json turbo.json ./
COPY libs ./libs
COPY apps ./apps

# Install all dependencies (Turbo will manage workspaces)
RUN npm ci

# Build only what we need (api, realtime, web)
RUN npx turbo run build --filter=api --filter=realtime --filter=ems-web

# ---------- 3. Backend Runtime ----------
FROM node:20-alpine AS backend
WORKDIR /workspace
ENV NODE_ENV=production
ENV WORKDIR=/workspace/apps/services

# Copy only the built backend and production dependencies
COPY --from=build /workspace/apps/services/api/build ./apps/services/api/build
COPY --from=build /workspace/apps/services/realtime/build ./apps/services/realtime/build
COPY --from=build /workspace/node_modules ./node_modules

# Copy any per-app node_modules (if not hoisted)
COPY --from=build /workspace/apps/services/api/node_modules ./apps/services/api/node_modules
COPY --from=build /workspace/apps/services/realtime/node_modules ./apps/services/realtime/node_modules

COPY --from=build /workspace/libs ./libs

COPY --from=build /workspace/apps/services/api/bin ./apps/services/api/bin
COPY --from=build /workspace/apps/services/api/sql ./apps/services/api/sql

COPY scripts/backend_entrypoint.sh ./scripts/backend_entrypoint.sh
RUN chmod +x ./scripts/backend_entrypoint.sh

EXPOSE 8080 8081
ENTRYPOINT ["./scripts/backend_entrypoint.sh"]

# ---------- 4. Web Runtime ----------
FROM node:20-alpine AS web
RUN npm install -g serve@14.2.1
WORKDIR /workspace

# Copy only the built web app
COPY --from=build /workspace/apps/web/dist ./apps/web/dist

EXPOSE 80
CMD ["serve", "-s", "apps/web/dist", "-l", "80"]
