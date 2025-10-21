FROM node:20-alpine

# Install dependencies needed for some npm packages
RUN apk add --no-cache python3 make g++

# Align npm version with repository's packageManager to avoid lockfile format mismatches
# package.json specifies: npm@11.6.1
RUN npm i -g npm@11.6.1

# Set working directory inside the image
WORKDIR /workspace

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy workspace package.json files for dependency resolution
COPY libs/models/package.json ./libs/models/
COPY libs/client/package.json ./libs/client/
COPY libs/server/package.json ./libs/server/
COPY apps/services/api/package.json ./apps/services/api/
COPY apps/services/api-amplify/package.json ./apps/services/api-amplify/
COPY apps/services/frc-fms/package.json ./apps/services/frc-fms/
COPY apps/services/realtime/package.json ./apps/services/realtime/
COPY apps/web/package.json ./apps/web/

# Copy full source (needed because some packages use file: links to local libs)
COPY libs/ ./libs/
COPY apps/ ./apps/

# Remove lockfile to avoid mismatches with current workspace tree in container
# RUN rm -f package-lock.json

# Install dependencies using lockfile (workspaces supported by pinned npm)
RUN npm ci --workspaces --include-workspace-root

# Build using turbo following the dependency order from turbo.json
# First build libraries in the correct order (models -> client & server)
RUN npm run build:libs
# Build selected apps/services as needed (api, realtime)
RUN npm run build --workspace=api
RUN npm run build --workspace=realtime

# Expose ports for development
# 5173: Vite dev server (web app)
# 8080: API service
# 8081: Realtime service
EXPOSE 5173/tcp
EXPOSE 8080/tcp
EXPOSE 8081/tcp

# Run the development command as defined in package.json
# This runs: turbo run dev api#start realtime#start
CMD ["npm", "run", "dev"]
