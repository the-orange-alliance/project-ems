FROM node:18-alpine

WORKDIR /
COPY /back-end /back-end
COPY /front-end /front-end
COPY /lib /lib
COPY /scripts /scripts

# Install @toa-lib/models
WORKDIR /lib/models
RUN npm install
RUN npm run build
RUN npm link

# Install @toa-lib/client
WORKDIR /lib/client
RUN npm install
RUN npm link @toa-lib/models
RUN npm run build

# Install @toa-lib/server
WORKDIR /lib/server
RUN npm install
RUN npm link @toa-lib/models
RUN npm run build

# Install @toa-lib/models
WORKDIR /back-end/api
RUN npm install

WORKDIR /back-end/realtime
RUN npm install

WORKDIR /front-end
RUN npm install

EXPOSE 5173/tcp
EXPOSE 8080/tcp
EXPOSE 8081/tcp

# Run
WORKDIR /
RUN source /scripts/run.sh