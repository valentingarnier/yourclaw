# YourClaw MVP

Multi-channel AI assistant (WhatsApp + Telegram). User signs in, picks a channel, pays ($20/mo + 48h trial), gets a personal Openclaw instance. No setup required.

## Architecture

- **Auth + DB**: Supabase (Google sign-in only, cloud Postgres)
- **Backend**: FastAPI — frontend never talks to Supabase directly for data
- **Frontend**: Next.js App Router + Tailwind + Catalyst UI
- **Containers**: Docker on Hetzner host. One container per user. Image: `yourclaw-openclaw:latest`
- **WhatsApp**: Single Twilio number, route by sender phone. Async REST API replies (no timeout).
- **Telegram**: Single bot (`@Yourclawdev_bot`), route by `telegram_chat_id`/`telegram_username`. Async Bot API replies.
- **Openclaw API**: `POST /v1/chat/completions` on port 18789 per container (OpenAI-compatible)
- **Job queue**: DB-backed (`provisioning_jobs` + Python worker polling). No Redis/Celery.
- **LLM providers**: Anthropic, OpenAI, Google. Shared keys + BYOK.
- **Payments**: Stripe Checkout subscription. 48h free trial. $10 credits on first purchase.
- **Mock mode**: `MOCK_TWILIO=true`, `MOCK_CONTAINERS=true`, `MOCK_STRIPE=true`, `MOCK_TELEGRAM=true`

## Repo Structure
```
/frontend                          — Next.js (marketing + app)
  src/app/(marketing)/             — /, /pricing, /privacy, /terms
  src/app/login/                   — Google OAuth
  src/app/onboarding/              — Channel selection
  src/app/dashboard/               — Sidebar layout (Assistant, API Keys, Subscription, Usage)
  src/components/                  — Catalyst UI components
  src/components/marketing/        — Marketing components
  src/lib/api.ts                   — API client + types
/backend/app/
  main.py, config.py, auth.py, schemas.py
  /routers/  — users, assistants, checkout, api_keys, usage, webhooks, oauth
  /services/ — container_service, openclaw_client, twilio_service, stripe_service, email_service, encryption, credits
  worker.py                        — Provisioning job worker
/infra/ansible                     — Host server bootstrap
/infra/docker                      — Container Dockerfiles + build script
```

## Data Model

Tables in `public` schema (auth via Supabase `auth.users`):

- **user_phones**: user_id, channel (WHATSAPP|TELEGRAM), phone_e164 (nullable), telegram_username, telegram_chat_id
- **assistants**: user_id, status (NONE|PROVISIONING|READY|ERROR), container_id, host_server_id, port, gateway_token_encrypted, model
- **host_servers**: ip, ssh_key_ref, max_containers, current_containers
- **messages**: user_id, direction (INBOUND|OUTBOUND), body, channel, twilio_sid, telegram_message_id
- **usage_daily**: user_id, date, inbound_count, outbound_count (UNIQUE user_id+date)
- **api_keys**: user_id, provider (ANTHROPIC|OPENAI|GOOGLE), encrypted_key
- **subscriptions**: user_id, stripe_customer_id, stripe_subscription_id, status (ACTIVE|PAST_DUE|CANCELED), current_period_end
- **user_credits**: user_id, total_cents, used_cents (NOT CURRENTLY USED)
- **provisioning_jobs**: user_id, status (PENDING|RUNNING|COMPLETED|FAILED), attempts, last_error
- **user_integrations**: user_id, service, tokens (PAUSED — Google OAuth not verified)

## State Machines

- **assistant.status**: NONE → PROVISIONING → READY (or ERROR → PROVISIONING retry)
- **subscriptions.status**: ACTIVE → PAST_DUE → CANCELED (PAST_DUE can return to ACTIVE)
- **provisioning_jobs.status**: PENDING → RUNNING → COMPLETED (or FAILED after 3 attempts)

## API Endpoints (`/api/v1`)

```
GET    /health
GET    /users/me                      — profile + phone + subscription
POST   /users/me/phone                — set WhatsApp number (legacy)
POST   /users/me/channel              — set channel + contact info

POST   /assistants                    — create/recreate (idempotent, requires subscription)
GET    /assistants                    — status + info
PATCH  /assistants                    — update model (triggers reprovision)
DELETE /assistants                    — destroy container

POST   /checkout                      — Stripe Checkout session
GET    /subscription                  — status + details (fetches live from Stripe)
POST   /subscription/cancel           — cancel at period end

GET    /api-keys                      — list BYOK keys (no values)
POST   /api-keys                      — add key (triggers reprovision)
DELETE /api-keys/{provider}           — remove key (triggers reprovision)

GET    /usage                         — daily message stats

POST   /webhooks/twilio/whatsapp      — Twilio inbound (signature validated)
POST   /webhooks/telegram             — Telegram inbound (secret token validated)
POST   /webhooks/stripe               — Stripe events (signature validated)
```

## Request Flows

**WhatsApp/Telegram inbound**: Webhook validates signature → lookup user → check assistant READY → return immediately → background task calls Openclaw container (`/v1/chat/completions` with last 20 messages) → send reply async (Twilio REST API / Telegram Bot API). No timeout.

**Provisioning**: POST /assistants → creates job → worker polls → SSH to host → `docker run yourclaw-{user_id}` → write config → health check → status=READY → send notification (WhatsApp template / Telegram DM).

**Stripe**: Checkout session → webhook `checkout.session.completed` → create subscription + trigger provisioning. Also handles `invoice.payment_succeeded/failed`, `customer.subscription.deleted/updated`.

**WhatsApp 24h session window**: Can only send free-form replies within 24h of user's last message. For proactive messages (e.g. "assistant ready"), use template messages (Content SID: `HX2da33755ce26e6cd5177e9d07bba71d6`).

## Openclaw Container Config

Each container gets `~/.openclaw/openclaw.json`:

```json
{
  "agents": { "defaults": {
    "model": { "primary": "anthropic/claude-sonnet-4-5-20250929" },
    "contextTokens": 200000, "thinkingDefault": "low",
    "blockStreamingDefault": "on",
    "compaction": { "memoryFlush": { "enabled": true } }
  }},
  "gateway": { "mode": "local", "port": 18789,
    "auth": { "mode": "token", "token": "<per-user-uuid4>" },
    "http": { "endpoints": { "chatCompletions": { "enabled": true } } }
  },
  "tools": { "profile": "full",
    "deny": ["browser", "playwright_browser_install"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": true } },
    "media": { "image": { "enabled": true } }
  },
  "plugins": { "entries": { "openclaw-mcp-adapter": { "enabled": true,
    "config": { "servers": [{ "name": "playwright", "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--browser", "chromium", "--headless", "--executable-path", "/usr/bin/chromium"]
    }]}
  }}},
  "browser": { "enabled": false },
  "commands": { "restart": true }
}
```

**Key points:**
- `tools.deny` removes native browser + install from LLM tool list (use Playwright MCP instead)
- LLM keys set as container env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`
- Gateway started with: `openclaw gateway --port 18789 --bind lan`
- Host paths: `/data/yourclaw/{user_id}/config/` → `/root/.openclaw`, `workspace/` → `/root/.openclaw/workspace`
- Gateway API is **stateless** — we pass last 20 messages from DB with each request
- Long-term memory via workspace files (USER.md, IDENTITY.md) — persists across reprovisions

## Available Models

| Model ID | Display Name |
|----------|--------------|
| `anthropic/claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 (default) |
| `anthropic/claude-opus-4-5-20251101` | Claude Opus 4.5 |
| `anthropic/claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `openai/gpt-4o` | GPT-4o |
| `openai/gpt-4o-mini` | GPT-4o Mini |
| `google/gemini-2.0-flash` | Gemini 2.0 Flash |
| `google/gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite |

Model changes trigger reprovisioning (PATCH /assistants → new provisioning job → container recreated).

## Conventions

- **Python**: snake_case, type hints, Pydantic models
- **TypeScript**: camelCase vars, PascalCase components, kebab-case files
- **API**: `/api/v1/` prefix, `{ "detail": "..." }` errors
- **Commits**: conventional (`feat:`, `fix:`, `docs:`, `chore:`)
- **Secrets**: never logged, encrypted at rest (Fernet), never in frontend
- **Idempotency**: provisioning is idempotent per user

## Security

- Twilio: HMAC-SHA1 signature validation
- Stripe: `stripe.Webhook.construct_event()` signature validation
- Telegram: `X-Telegram-Bot-Api-Secret-Token` header validation
- Auth: Supabase JWT on every API request (middleware)
- Encryption: Fernet for API keys + gateway tokens
- Host: SSH key only, firewall restricts container ports to backend IP
- Containers: memory/CPU limits, Docker socket mounted for browser sandbox

## Local Dev

```bash
cd frontend && pnpm install
cd backend && uv sync
# Backend: MOCK_TWILIO=true MOCK_CONTAINERS=true MOCK_STRIPE=true uv run uvicorn app.main:app --reload --port 8000
# Worker:  MOCK_CONTAINERS=true uv run python -m app.worker
# Frontend: pnpm dev (port 3000)
```

See `.env.example` for all env vars.

## Production

- Backend: Render (`https://yourclaw.onrender.com`)
- Frontend: Vercel (`https://www.yourclaw.dev`)
- Stripe Price ID: `price_1SyZSbCFAYv3UO1LWxf67wDW`
- GA4: `G-2E55TEMF7X`
- Emails: Resend (`hello@yourclaw.dev`)

## Paused Features

- **Google Integrations** (Calendar, Gmail, Drive): Backend complete (`routers/oauth.py`, `user_integrations` table), UI hidden. Waiting for Google OAuth verification. Files: `supabase/migrations/002_user_integrations.sql`.

## TODOs

1. **Increase Anthropic API rate limit** — Currently Tier 1 (50k tokens/min). Need Tier 2+ for production scale.
2. **Rate limits** — Implement daily (100 msg/day) + per-minute (5 msg/min) limits.
3. **Re-enable Google Integrations** after OAuth app verification.
