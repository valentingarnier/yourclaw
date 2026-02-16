# YourClaw MVP

Telegram AI assistant. User signs in, picks Telegram, pays ($20/mo + 48h trial), gets a personal Openclaw instance. WhatsApp coming soon.

## Architecture

- **Auth + DB**: Supabase (Google sign-in only, cloud Postgres)
- **Backend**: FastAPI — frontend never talks to Supabase directly for data
- **Frontend**: Next.js App Router + Tailwind + Catalyst UI
- **Infra**: k3s on Hetzner. One pod per user. Separate infra API handles provisioning.
- **Telegram**: Per-user bot (user provides their own @BotFather token), open DM policy (bot token is the access control). Async Bot API replies.
- **WhatsApp**: Paused (Coming Soon). Single Twilio number, route by sender phone.
- **Openclaw API**: `POST /v1/chat/completions` on port 18789 per pod (OpenAI-compatible)
- **Provisioning**: Direct HTTPS calls to infra API. No worker, no job queue.
- **LLM providers**: Anthropic, OpenAI, Google. Shared keys + BYOK via Vercel AI Gateway.
- **Payments**: Stripe Checkout subscription. 48h free trial. $10 credits on first purchase.
- **Mock mode**: `MOCK_TWILIO=true`, `MOCK_CONTAINERS=true`, `MOCK_STRIPE=true`

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
  /services/ — infra_api, openclaw_client, twilio_service, stripe_service, email_service, encryption, credits
/backend-infra/                    — Infra API (separate service on k3s control plane)
```

## Data Model

Tables in `public` schema (auth via Supabase `auth.users`):

- **user_phones**: user_id, channel (WHATSAPP|TELEGRAM), phone_e164 (nullable), telegram_chat_id, telegram_bot_token_encrypted
- **assistants**: user_id, status (NONE|PROVISIONING|READY|ERROR), claw_id, model
- **messages**: user_id, direction (INBOUND|OUTBOUND), body, channel, twilio_sid, telegram_message_id
- **usage_daily**: user_id, date, inbound_count, outbound_count (UNIQUE user_id+date)
- **api_keys**: user_id, provider (ANTHROPIC|OPENAI|GOOGLE), encrypted_key
- **subscriptions**: user_id, stripe_customer_id, stripe_subscription_id, status (ACTIVE|PAST_DUE|CANCELED), current_period_end
- **user_credits**: user_id, total_cents, used_cents (NOT CURRENTLY USED)
- **user_integrations**: user_id, service, tokens (PAUSED — Google OAuth not verified)

## State Machines

- **assistant.status**: NONE → PROVISIONING → READY (or ERROR → PROVISIONING retry)
- **subscriptions.status**: ACTIVE → PAST_DUE → CANCELED (PAST_DUE can return to ACTIVE)

## API Endpoints (`/api/v1`)

```
GET    /health
GET    /users/me                      — profile + phone + subscription
POST   /users/me/phone                — set WhatsApp number (legacy)
POST   /users/me/channel              — set channel + contact info

POST   /assistants                    — create/recreate (idempotent, requires subscription)
GET    /assistants                    — status + info
PATCH  /assistants                    — update model (triggers reprovision)
DELETE /assistants                    — destroy pod

POST   /checkout                      — Stripe Checkout session
GET    /subscription                  — status + details (fetches live from Stripe)
POST   /subscription/cancel           — cancel at period end

GET    /api-keys                      — list BYOK keys (no values)
POST   /api-keys                      — add key (triggers reprovision)
DELETE /api-keys/{provider}           — remove key (triggers reprovision)

GET    /usage                         — daily message stats

POST   /webhooks/twilio/whatsapp      — Twilio inbound (signature validated, paused)
POST   /webhooks/stripe               — Stripe events (signature validated)
```

## Infra API

Separate service running on the k3s control plane. Backend calls it via HTTPS (`https://infra.api.yourclaw.dev`).

```
GET    /health                        — health check (no auth)
POST   /provision                     — create/update OpenClaw pod (idempotent)
POST   /deprovision                   — destroy single claw instance
POST   /deprovision-user              — destroy ALL claw instances for a user
GET    /claws                         — list all running claw instances
GET    /claws/{user_id}/{claw_id}     — get pod status (ready, phase, node, IP)
GET    /claws/{user_id}/{claw_id}/logs — get pod logs (?tail=N)
```

All endpoints (except /health) require `Authorization: Bearer <YOURCLAW_API_KEY>`.

Config: `INFRA_API_URL` (`https://infra.api.yourclaw.dev`), `YOURCLAW_API_KEY` (Bearer token).

See `backend-infra/API.md` for full spec.

## Request Flows

**Telegram inbound**: OpenClaw pod handles Telegram natively via its built-in telegram plugin. The pod receives messages directly using the user's @BotFather bot token (long polling), processes them through the LLM, and replies via Telegram Bot API. No backend relay needed.

**Provisioning**: POST /assistants → validate subscription → call infra API `/provision` with user keys + telegram bot token → infra API creates k8s Deployment, Service, ConfigMap, Secret, PVC, CiliumNetworkPolicy → status=PROVISIONING until pod is ready. GET /assistants checks real pod status via infra API.

**Stripe**: Checkout session → webhook `checkout.session.completed` → create subscription + credits. User then creates assistant from dashboard. Also handles `invoice.payment_succeeded/failed`, `customer.subscription.deleted/updated`.

**BYOK key update**: POST /api-keys → store encrypted key → re-provision same claw_id with updated keys (idempotent).

## Available Models

| Model ID | Display Name |
|----------|--------------|
| `openai/gpt-5.2-codex` | GPT-5.2 Codex (default) |
| `openai/gpt-4o` | GPT-4o |
| `openai/gpt-4o-mini` | GPT-4o Mini |
| `anthropic/claude-opus-4.6` | Claude Opus 4.6 |
| `anthropic/claude-sonnet-4.5` | Claude Sonnet 4.5 |
| `anthropic/claude-haiku-4.5` | Claude Haiku 4.5 |
| `google/gemini-2.0-flash` | Gemini 2.0 Flash |
| `google/gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite |

Model changes trigger reprovisioning (PATCH /assistants → deprovision old + provision new via infra API).

## Conventions

- **Python**: snake_case, type hints, Pydantic models
- **TypeScript**: camelCase vars, PascalCase components, kebab-case files
- **API**: `/api/v1/` prefix, `{ "detail": "..." }` errors
- **Commits**: conventional (`feat:`, `fix:`, `docs:`, `chore:`)
- **Secrets**: never logged, encrypted at rest (Fernet), never in frontend
- **Idempotency**: provisioning is idempotent per user (same claw_id = update in place)

## Security

- Stripe: `stripe.Webhook.construct_event()` signature validation
- Telegram: OpenClaw handles natively per pod (per-user bot token, no shared bot)
- Twilio: HMAC-SHA1 signature validation (WhatsApp, paused)
- Auth: Supabase JWT on every API request (middleware)
- Encryption: Fernet for API keys + bot tokens
- Infra API: Bearer token auth, firewall restricts access
- Pods: CiliumNetworkPolicy, resource limits, persistent volumes

## Local Dev

```bash
cd frontend && pnpm install
cd backend && uv sync

# Backend (set env vars in backend/.env):
#   DEV_USER_ID=<uuid>              — bypass Google OAuth
#   MOCK_CONTAINERS=true            — skip infra API calls
#   MOCK_STRIPE=true                — skip subscription check
#   MOCK_TWILIO=true
uv run uvicorn app.main:app --reload --port 8000

# Frontend (set NEXT_PUBLIC_DEV_MODE=true in frontend/.env.local):
pnpm dev  # port 3000
```

Dev mode auto-creates the dev user in Supabase auth on backend startup.

No worker needed — provisioning is synchronous via infra API.

## Production

- Backend: Render (`https://yourclaw.onrender.com`)
- Frontend: Vercel (`https://www.yourclaw.dev`)
- Infra API: Hetzner k3s (`https://infra.api.yourclaw.dev`)
- Stripe Price ID: `price_1SyZSbCFAYv3UO1LWxf67wDW`
- GA4: `G-2E55TEMF7X`
- Emails: Resend (`hello@yourclaw.dev`)

## Paused Features

- **WhatsApp**: UI shows "Coming Soon" badge. Backend Twilio integration exists but disabled in frontend.
- **Google Integrations** (Calendar, Gmail, Drive): Backend exists (`routers/oauth.py`, `user_integrations` table), UI hidden. Waiting for Google OAuth verification.

## TODOs

1. **Increase Anthropic API rate limit** — Currently Tier 1 (50k tokens/min). Need Tier 2+ for production scale.
2. **Rate limits** — Implement daily (100 msg/day) + per-minute (5 msg/min) limits.
3. **Re-enable Google Integrations** after OAuth app verification.
4. **Re-enable WhatsApp** once Twilio number is configured.
