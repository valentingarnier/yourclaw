# YourClaw

WhatsApp-first AI assistant powered by OpenClaw. Sign in, enter your phone number, pay, and get a personal AI assistant on WhatsApp. No setup, no technical knowledge required.

## Features

- **WhatsApp Integration** - Chat with your AI assistant directly on WhatsApp
- **Full OpenClaw Power** - Web browsing, file operations, code execution, and more
- **Google Integrations** - Connect Calendar, Gmail, and Drive via MCP servers
- **Model Selection** - Choose between Claude Sonnet, Opus, or Haiku
- **Bring Your Own Key** - Use your own Anthropic API key for unlimited usage

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Frontend  │────▶│   Backend   │────▶│   Host Server       │
│   (Vercel)  │     │   (Render)  │     │   (Hetzner Docker)  │
│   Next.js   │     │   FastAPI   │     │   OpenClaw containers│
└─────────────┘     └─────────────┘     └─────────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  Twilio  │  │ Supabase │
              │ WhatsApp │  │ Auth + DB│
              └──────────┘  └──────────┘
```

## Project Structure

```
/frontend          # Next.js app (Vercel)
/backend           # FastAPI API + Worker (Render)
/infra             # Docker configs for host server
/supabase          # Database migrations
/docs              # Documentation
```

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.12+
- pnpm
- uv (Python package manager)

### Backend

```bash
cd backend
cp .env.example .env  # Fill in values
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
cp .env.example .env.local  # Fill in values
pnpm install
pnpm dev
```

App: http://localhost:3000

### Worker (for container provisioning)

```bash
cd backend
uv run python -m app.worker
```

## Environment Variables

### Backend (.env)

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Host Server
HOST_SERVER_IP=
HOST_SERVER_SSH_KEY_PATH=  # Local dev
HOST_SERVER_SSH_KEY=       # Production (key content)

# LLM
ANTHROPIC_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Security
ENCRYPTION_KEY=

# URLs
API_URL=http://localhost:8000
APP_URL=http://localhost:3000

# Mock Mode (local dev)
MOCK_TWILIO=true
MOCK_CONTAINERS=true
MOCK_STRIPE=true
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

### Frontend (Vercel)

1. Connect repo to Vercel
2. Set **Root Directory**: `frontend`
3. Add environment variables
4. Deploy

### Backend (Render)

1. Connect repo to Render via Blueprint
2. Render reads `render.yaml` automatically
3. Add environment variables in dashboard
4. Deploy

### Host Server (Hetzner)

1. Provision a Hetzner CX41 or similar
2. Run `infra/docker/build.sh` to build the OpenClaw image
3. Configure firewall to allow backend IP
4. Add SSH key to Render env vars

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/users/me` | Current user profile |
| `POST /api/v1/users/me/phone` | Set WhatsApp number |
| `POST /api/v1/assistants` | Create assistant |
| `GET /api/v1/assistants` | Get assistant status |
| `POST /api/v1/checkout` | Create Stripe checkout |
| `POST /api/v1/webhooks/twilio/whatsapp` | Twilio webhook |
| `POST /api/v1/webhooks/stripe` | Stripe webhook |

## License

Proprietary
