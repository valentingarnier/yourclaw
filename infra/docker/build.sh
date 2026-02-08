#!/bin/bash
# Build YourClaw Docker images on the host server
#
# Usage:
#   1. Copy this directory to the host server
#   2. Run: ./build.sh
#
# Or remotely:
#   scp -r infra/docker/ root@$HOST_SERVER_IP:/tmp/yourclaw-docker/
#   ssh root@$HOST_SERVER_IP "cd /tmp/yourclaw-docker && ./build.sh"

set -e

echo "=== Building YourClaw Docker Images ==="
echo ""

# Build gateway image (lightweight, no browser)
echo "[1/2] Building yourclaw-openclaw:latest (gateway)..."
docker build -t yourclaw-openclaw:latest -f Dockerfile .
echo "Done!"
echo ""

# Build browser sandbox image (Chromium for browser tool)
echo "[2/2] Building openclaw-sandbox-browser:bookworm-slim (browser sandbox)..."
docker build -t openclaw-sandbox-browser:bookworm-slim -f Dockerfile.sandbox-browser .
echo "Done!"
echo ""

echo "=== All images built ==="
echo ""
echo "Images:"
docker images | grep -E "yourclaw-openclaw|openclaw-sandbox-browser"
