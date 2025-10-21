FROM node:20-alpine

# Install dependencies needed for some npm packages
RUN apk add --no-cache python3 make g++

# Set working directory to root
WORKDIR /

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

# Verify root package.json and workspaces are visible
RUN node -e "try{console.log('root workdir:',process.cwd());const pkg=require('./package.json');console.log('workspaces:',pkg.workspaces);}catch(e){console.error('Failed to read root package.json',e);process.exit(1)}"

# Install dependencies for root and workspaces (force workspace mode)
# Change echo string to invalidate layer cache when needed
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund && echo "workspace install complete"

# Debug: Verify luxon is installed and resolvable for @toa-lib/models
RUN node -e "try{require.resolve('luxon');console.log('luxon resolvable from root')}catch(e){console.log('luxon NOT resolvable from root')}"
RUN node -e "try{console.log(require.resolve('luxon/package.json'))}catch(e){console.log('luxon package.json NOT resolvable')}"
RUN npm ls luxon || echo "npm ls luxon failed (possibly due to peer issues)"

# Build using turbo following the dependency order from turbo.json
# First build libraries in the correct order (models -> client & server)
RUN npm run build:libs

# Then build services that depend on libraries following turbo.json priorities
RUN npm run build --workspace=api
RUN npm run build --workspace=realtime
# RUN npm run build --workspace=ems-frc-fms # not needed usually

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
