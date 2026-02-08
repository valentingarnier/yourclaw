# YourClaw OpenClaw Gateway Container
# Full-featured: OpenClaw + Playwright MCP for browser automation

FROM node:22-bookworm-slim

# Install system dependencies for OpenClaw, Chromium, and basic tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    gnupg \
    # Chromium and dependencies for Playwright browser automation
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
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
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium path for Playwright
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install OpenClaw and Playwright MCP server globally
RUN npm install -g openclaw @playwright/mcp

# Create openclaw config directory
RUN mkdir -p /root/.openclaw/workspace

# Install MCP adapter plugin from GitHub
RUN git clone https://github.com/androidStern-personal/openclaw-mcp-adapter.git /tmp/mcp-adapter \
    && cd /tmp/mcp-adapter && npm install \
    && openclaw plugins install /tmp/mcp-adapter \
    && rm -rf /tmp/mcp-adapter

# Default command: start gateway
CMD ["openclaw", "gateway", "--port", "18789", "--bind", "lan"]
