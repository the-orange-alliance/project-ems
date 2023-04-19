#!/bin/bash

# Run the frontend
source ./run.sh &
  
# Run the backend api
source ./backend-api.sh &

# Run the backend socket server
source ./backend-realtime.sh &
  
# Wait for any process to exit
wait -n
  
# Exit with status of process that exited first
exit $?