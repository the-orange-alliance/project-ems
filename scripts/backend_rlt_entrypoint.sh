#!/bin/sh
echo "SERVICE_NAME=realtime" > ./apps/services/realtime/.env
echo "SERVICE_PORT=8081" >> ./apps/services/realtime/.env
echo "APP_ROOT=/workspace/apps/services/realtime" >> ./apps/services/realtime/.env

node apps/services/realtime/build/Server.js &
realtime_pid=$!

# Docker signals PID 1; forward them so Fastify can drain statistics workers.
shutdown() {
  trap '' TERM INT
  kill -TERM "$realtime_pid" 2>/dev/null || true
  wait "$realtime_pid" 2>/dev/null || true
}
trap shutdown TERM INT
wait "$realtime_pid"
