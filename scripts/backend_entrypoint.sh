#!/bin/sh
echo "SERVICE_NAME=api" > ./apps/services/api/.env
echo "SERVICE_PORT=8080" >> ./apps/services/api/.env
echo "APP_ROOT=/workspace/apps/services/api" >> ./apps/services/api/.env

echo "SERVICE_NAME=realtime" > ./apps/services/realtime/.env
echo "SERVICE_PORT=8081" >> ./apps/services/realtime/.env

node apps/services/api/build/Server.js &
node apps/services/realtime/build/Server.js &
wait
