# YourClaw MVP

Telegram & WhatsApp AI assistant. User signs in, picks a channel, pays ($20/mo + 48h trial), gets a personal OpenClaw instance.

## Stack

- **Frontend**: Next.js App Router + Tailwind + Catalyst UI
- **Backend**: FastAPI + Supabase (auth + Postgres)
- **Infra**: k3s on Hetzner, one pod per user, separate infra API
- **Payments**: Stripe subscription
- **LLM providers**: Anthropic, OpenAI, Vercel AI Gateway (MiniMax, DeepSeek, Kimi). BYOK only (users must provide their own API keys).

## Repo Structure

```
/frontend              — Next.js (marketing + app)
  src/app/(marketing)/ — /, /pricing, /privacy, /terms
  src/app/dashboard/   — Sidebar layout (Assistant, API Keys, Tools, Subscription)
  src/lib/api.ts       — API client + types
/backend/app/          — FastAPI
  /routers/            — users, assistants, checkout, api_keys, webhooks, oauth
  /services/           — infra_api, stripe_service, encryption
/backend-infra/        — Infra API (separate service on k3s control plane)
```

## Conventions

- **Python**: snake_case, type hints, Pydantic models
- **TypeScript**: camelCase vars, PascalCase components, kebab-case files
- **API**: `/api/v1/` prefix, `{ "detail": "..." }` errors
- **Commits**: conventional (`feat:`, `fix:`, `docs:`, `chore:`)
- **Secrets**: never logged, encrypted at rest (Fernet), never in frontend
- **Idempotency**: provisioning is idempotent per user (same claw_id = update in place)

## Definition of Done

Before marking ANY task complete:

1. Backend: `cd backend && uv run pytest` — all green
2. Frontend: `cd frontend && pnpm lint` — zero errors
3. Frontend: `cd frontend && pnpm build` — no errors
4. No `console.log` / `print()` left behind
5. Secrets never logged, never in frontend

## Deep Docs (read when relevant)

- API endpoints: see top of each router file
- Infra API: see `backend-infra/API.md`
- Data model: see `docs/data-model.md`
- Request flows: see `docs/flows.md`
- Available models: see `docs/models.md`
- Security: see `docs/security.md`
- Deployment / env vars: see `docs/deployment.md`

## Current State

- **Working**: Auth, Telegram provisioning, WhatsApp provisioning + QR login, Stripe billing, BYOK API keys, model switching, Vercel AI Gateway
- **Paused**: Google Integrations (OAuth not verified)
- **WhatsApp flow**: User enters phone (E.164) on the dashboard (not onboarding). Pod is provisioned with `whatsapp_allow_from=[phone]`. When pod becomes READY, QR login dialog auto-opens. SSE proxy (`/api/whatsapp-login` → infra API → pod `:18789/whatsapp/login`) streams QR codes. After scan, `connected` event fires → pod restarts → dashboard polls until READY → dialog auto-closes. No Twilio.
- **Onboarding**: Only used for initial prefill (channel + phone). Dashboard handles all assistant creation/management. No redirect from dashboard to onboarding.
- **Google/Gemini models**: Removed — only Anthropic, OpenAI, and Vercel AI Gateway models are supported
- **Vercel AI Gateway**: Users can add a Vercel AI Gateway key to access cheap models (MiniMax, DeepSeek, Kimi). When Vercel key is present, only `ai_gateway_key` is sent to provisioning (other provider keys are excluded). Model IDs are passed as-is; OpenClaw routes through the gateway via the `AI_GATEWAY_API_KEY` env var.
- **Model IDs**: Anthropic/OpenAI use hyphens (`anthropic/claude-sonnet-4-5`). Vercel models use real provider IDs with dots (`minimax/minimax-m2.1`, `deepseek/deepseek-v3.2`, `moonshotai/kimi-k2.5`).
- **Credits/Usage**: Removed — no credits system, no usage tracking in dashboard. BYOK only.
- **Two config builders**: `backend-infra/src/backend_infra/services/config_builder.py` is the one used by the infra API (builds actual pod config). `backend/app/services/infra/config_builder.py` is a local copy (used by local claw_client). Both must stay in sync.

## TODOs

1. **Anthropic rate limit** — Currently Tier 1 (50k tokens/min). Need Tier 2+.
2. **Rate limits** — Implement daily (100 msg/day) + per-minute (5 msg/min) limits.
3. **Re-enable Google Integrations** after OAuth app verification.
