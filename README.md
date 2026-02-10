# YourClaw

**The easiest way to run OpenClaw.** Fully managed AI assistant on WhatsApp & Telegram. No servers, no terminal, no setup.

> Sign up, pick a channel, start chatting. Your own OpenClaw instance in under 1 minute.

## How it works

```
You                          YourClaw                        Your OpenClaw Instance
 |                              |                                    |
 |  1. Sign up with Google      |                                    |
 |----------------------------->|                                    |
 |                              |  2. We deploy a dedicated          |
 |                              |     OpenClaw container for you     |
 |                              |----------------------------------->|
 |  3. Text your assistant      |                                    |
 |  on WhatsApp or Telegram     |  4. Route message to your          |
 |----------------------------->|     container                      |
 |                              |----------------------------------->|
 |                              |                   5. AI processes  |
 |                              |<-----------------------------------|
 |  6. Get the reply            |                                    |
 |<-----------------------------|                                    |
```

**That's it.** No VPS, no Docker, no config files. We handle everything.

## What you get

| Feature | Details |
|---------|---------|
| Your own server | Dedicated OpenClaw container, isolated and private |
| WhatsApp & Telegram | Pick your channel, switch anytime |
| 7 AI models | Claude, GPT-4o, Gemini - choose from the dashboard |
| Web browsing | Your assistant can browse any website |
| File creation | Create, read, and analyze documents |
| 24/7 availability | Always on, always ready |
| BYOK | Bring your own API keys for any provider |

## Pricing

**$20/month** with 48h free trial + $10 in AI credits on first purchase.

## Architecture

```
                    +-----------+
                    |  Vercel   |
                    |  Next.js  |  <-- Marketing + Dashboard
                    +-----+-----+
                          |
                    +-----v-----+       +-------------------+
                    |  Render   |       |  Hetzner Server   |
                    |  FastAPI  +------>+  Docker containers |
                    +-----+-----+       |  (1 per user)     |
                          |             +-------------------+
                   +------+------+
                   |      |      |
              +----v+ +---v--+ +-v------+
              |Twilio| |Tgram | |Supabase|
              |  WA  | | Bot  | |Auth+DB |
              +------+ +------+ +--------+
```

## Project structure

```
/frontend          Next.js app (Vercel) - marketing + dashboard
/backend           FastAPI API + provisioning worker (Render)
/infra             Docker configs + Ansible for host server
/supabase          Database migrations
/docs              Architecture docs, runbook, competitor analysis
```

## Quick start (local dev)

### 1. Backend

```bash
cd backend
cp .env.example .env           # fill in Supabase + encryption keys
uv sync
MOCK_TWILIO=true MOCK_CONTAINERS=true MOCK_STRIPE=true \
  uv run uvicorn app.main:app --reload --port 8000
```

### 2. Worker

```bash
cd backend
MOCK_CONTAINERS=true uv run python -m app.worker
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local     # fill in Supabase + API URL
pnpm install && pnpm dev
```

Open http://localhost:3000

## API

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/users/me` | Current user + subscription |
| `POST` | `/api/v1/users/me/channel` | Set WhatsApp or Telegram |
| `POST` | `/api/v1/assistants` | Create assistant (triggers provisioning) |
| `GET` | `/api/v1/assistants` | Assistant status |
| `PATCH` | `/api/v1/assistants` | Change model (triggers reprovision) |
| `DELETE` | `/api/v1/assistants` | Destroy assistant |
| `POST` | `/api/v1/checkout` | Stripe checkout (48h free trial) |
| `GET` | `/api/v1/api-keys` | List BYOK keys |
| `POST` | `/api/v1/api-keys` | Add BYOK key |
| `POST` | `/api/v1/webhooks/twilio/whatsapp` | WhatsApp inbound |
| `POST` | `/api/v1/webhooks/telegram` | Telegram inbound |
| `POST` | `/api/v1/webhooks/stripe` | Stripe events |

Full API docs at `/docs` when running locally.

## Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | Root: `frontend`, auto-deploy from `main` |
| Backend | Render | Uses `render.yaml`, auto-deploy from `main` |
| Host server | Hetzner CX41 | Docker, SSH access, firewall to backend IP only |
| Database | Supabase | Cloud Postgres, Google OAuth |

## Tech stack

Next.js 15 / Tailwind / Catalyst UI / FastAPI / SQLAlchemy / Supabase / Stripe / Docker / OpenClaw / Twilio / Telegram Bot API

## License

Proprietary
