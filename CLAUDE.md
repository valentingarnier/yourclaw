# YourClaw MVP

Telegram AI assistant. User signs in, picks Telegram, pays ($20/mo + 48h trial), gets a personal OpenClaw instance. WhatsApp coming soon.

## Stack

- **Frontend**: Next.js App Router + Tailwind + Catalyst UI
- **Backend**: FastAPI + Supabase (auth + Postgres)
- **Infra**: k3s on Hetzner, one pod per user, separate infra API
- **Payments**: Stripe subscription
- **LLM providers**: Anthropic, OpenAI. Shared keys + BYOK via Vercel AI Gateway.

## Repo Structure

```
/frontend              — Next.js (marketing + app)
  src/app/(marketing)/ — /, /pricing, /privacy, /terms
  src/app/dashboard/   — Sidebar layout (Assistant, API Keys, Subscription, Usage)
  src/lib/api.ts       — API client + types
/backend/app/          — FastAPI
  /routers/            — users, assistants, checkout, api_keys, usage, webhooks, oauth
  /services/           — infra_api, stripe_service, encryption, credits
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

- **Working**: Auth, Telegram provisioning, Stripe billing, BYOK API keys, model switching
- **Paused**: WhatsApp (UI shows "Coming Soon"), Google Integrations (OAuth not verified)
- **Google/Gemini models**: Removed — only Anthropic and OpenAI models are supported

## TODOs

1. **Anthropic rate limit** — Currently Tier 1 (50k tokens/min). Need Tier 2+.
2. **Rate limits** — Implement daily (100 msg/day) + per-minute (5 msg/min) limits.
3. **Re-enable Google Integrations** after OAuth app verification.
4. **Re-enable WhatsApp** once Twilio number is configured.
