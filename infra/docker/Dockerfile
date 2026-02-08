# YourClaw OpenClaw container with browser support
# Base: node:22-bookworm (OpenClaw requires git which is included)

FROM node:22-bookworm

# Install Chromium and dependencies for browser automation
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium path for OpenClaw browser tool
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Disable Chromium sandbox (required in Docker)
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"

# Pre-install openclaw globally to speed up container startup
RUN npm install -g openclaw

# Create openclaw config directory
RUN mkdir -p /root/.openclaw/workspace

# Default command: start gateway
CMD ["openclaw", "gateway", "--port", "18789", "--bind", "lan"]
