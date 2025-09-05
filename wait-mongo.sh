#!/bin/bash

echo "⏳ Waiting for MongoDB to be ready..."

status="starting"

while [ "$status" != "healthy" ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' local-mongo 2>/dev/null || echo "starting")
    echo "MongoDB status: $status"
    sleep 2
done

echo "✅ MongoDB is UP!"
echo "You can now access Mongo Express GUI at: http://localhost:8081"
