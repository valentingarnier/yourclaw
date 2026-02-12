# YourClaw OpenClaw Gateway Container
# Lightweight — no browser. Browser runs in separate sidecar container.

FROM node:22-bookworm-slim

# System dependencies for OpenClaw
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally
RUN npm install -g openclaw

# Setup home directory for non-root user
RUN mkdir -p /home/node/.openclaw/workspace \
    && chown -R node:node /home/node

USER node
WORKDIR /home/node

# Default command: start gateway on LAN
CMD ["openclaw", "gateway", "--port", "18789", "--bind", "lan"]
