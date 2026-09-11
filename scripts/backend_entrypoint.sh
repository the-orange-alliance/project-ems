#!/bin/sh
echo "SERVICE_NAME=api" > ./apps/services/api/.env
echo "SERVICE_PORT=8080" >> ./apps/services/api/.env
echo "APP_ROOT=/workspace/apps/services/api" >> ./apps/services/api/.env

echo "SERVICE_NAME=realtime" > ./apps/services/realtime/.env
echo "SERVICE_PORT=8081" >> ./apps/services/realtime/.env

node apps/services/api/build/Server.js &
api_pid=$!
node apps/services/realtime/build/Server.js &
realtime_pid=$!

# Docker signals PID 1; forward them so Fastify can drain statistics workers.
shutdown() {
  trap '' TERM INT
  kill -TERM "$api_pid" "$realtime_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
  wait "$realtime_pid" 2>/dev/null || true
}
trap shutdown TERM INT
wait "$api_pid" "$realtime_pid"
