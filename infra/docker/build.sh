#!/bin/bash
# Build YourClaw Docker images
#
# Usage (local):
#   cd infra/docker && ./build.sh
#
# Usage (remote):
#   scp -r infra/docker/ root@$HOST_IP:/tmp/yourclaw-docker/
#   ssh root@$HOST_IP "cd /tmp/yourclaw-docker && ./build.sh"

set -e

echo "=== Building YourClaw Docker Images ==="
echo ""

echo "[1/2] Building yourclaw-openclaw:latest (gateway)..."
docker build -t yourclaw-openclaw:latest -f Dockerfile .
echo "Done!"
echo ""

echo "[2/2] Building openclaw-sandbox-browser:bookworm-slim (browser sidecar)..."
docker build -t openclaw-sandbox-browser:bookworm-slim -f Dockerfile.sandbox-browser .
echo "Done!"
echo ""

echo "=== All images built ==="
echo ""
echo "Images:"
docker images | grep -E "yourclaw-openclaw|openclaw-sandbox-browser"
