#!/bin/bash
# Build the YourClaw OpenClaw container image on the host server
#
# Usage:
#   1. Copy this directory to the host server
#   2. Run: ./build.sh
#
# Or remotely:
#   scp -r infra/docker/ root@$HOST_SERVER_IP:/tmp/yourclaw-docker/
#   ssh root@$HOST_SERVER_IP "cd /tmp/yourclaw-docker && ./build.sh"

set -e

echo "Building yourclaw-openclaw image..."
docker build -t yourclaw-openclaw:latest .

echo "Done! Image built: yourclaw-openclaw:latest"
