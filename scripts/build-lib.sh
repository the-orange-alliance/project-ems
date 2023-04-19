cd lib/models

# Build the models
npm install
npm run build
npm link

# Build client
cd ../client
npm install
npm link @toa-lib/models
npm run build

# Build server
cd ../server
npm install
npm link @toa-lib/models
npm run build

cd ../..