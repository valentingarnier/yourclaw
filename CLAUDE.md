# YourClaw MVP

## Product
WhatsApp-first AI assistant. User signs in, enters phone number, pays, gets a personal Openclaw instance on WhatsApp. No setup, no technical knowledge required.

Positioning: "Your always-on AI assistant on WhatsApp. Watches, notifies, acts — while you sleep."

## Architecture Decisions
- **Auth + DB**: Supabase (Google sign-in only, cloud Postgres, no local emulator)
- **Backend**: FastAPI — all traffic routed through it (frontend never talks to Supabase directly for data)
- **Frontend**: Next.js App Router + Tailwind (single app with marketing + authenticated routes)
- **Containers**: Docker on shared Hetzner host server (NOT VMs). One container per user.
- **WhatsApp**: Single Twilio number, route inbound by sender phone (`From` field). Uses Twilio API (NOT Openclaw's built-in Baileys integration).
- **Openclaw API**: `POST /v1/chat/completions` on port 18789 per container (OpenAI-compatible, enabled via gateway config)
- **Container image**: Custom `yourclaw-openclaw:latest` with Chromium for browser tool support
- **Openclaw install**: Pre-installed in container image, starts with `openclaw gateway`
- **Job queue**: DB-backed (`provisioning_jobs` table + Python worker polling). No Redis/Celery for MVP. Low traffic assumed.
- **LLM provider**: Anthropic only (modular design for future providers). Shared API key with credits + BYOK.
- **Openclaw tools**: ALL tools enabled. No restrictions. Full power of Openclaw.
- **Payments**: Stripe Checkout for subscription. Required before assistant creation.
- **Mock mode**: `MOCK_TWILIO=true`, `MOCK_CONTAINERS=true`, `MOCK_STRIPE=true` for local dev without real credentials.

## User Journey (End to End)
```
1. User lands on yourclaw.com → sees landing page with demo + CTA
2. User clicks "Get Started" → goes to /login
3. User signs in with Google (Supabase Auth)
4. User enters WhatsApp number (E.164 format) on /onboarding
5. User clicks "Create my assistant" on /dashboard
6. No active subscription? → Redirect to Stripe Checkout ($20/mo)
7. Stripe payment succeeds → webhook fires → subscription created in DB
8. User returns to dashboard → provisioning starts automatically
9. Backend creates provisioning_job → worker picks up
10. Worker SSHs to host server → docker run openclaw container
11. Writes config (API key, gateway token) → starts openclaw gateway
12. Health check passes → assistant status = READY
13. Backend sends "Your assistant is ready! Say hi." WhatsApp via Twilio
14. User messages the Twilio WhatsApp number
15. Twilio webhook → backend routes to user's container → gets reply → sends back
16. Usage tracked per day. Rate limits enforced. Credits decremented.
```

## Request Flows

### WhatsApp Message
```
User WhatsApp → Twilio → POST /api/v1/webhooks/twilio/whatsapp (FastAPI)
  → validate Twilio signature (X-Twilio-Signature, HMAC-SHA1)
  → parse Form data: From, Body, MessageSid, ProfileName, NumMedia, MediaUrl0
  → lookup user by From phone (strip "whatsapp:" prefix, match E.164)
  → check assistant status == READY
  → check rate limits (msg/min) + daily caps (msg/day)
  → check credits remaining (shared key) or BYOK active
  → POST /v1/chat/completions on user container (host_ip:user_port)
    → Authorization: Bearer <gateway_token>
    → body: { "model": "openclaw:main", "messages": [{"role": "user", "content": "<body>"}] }
  → get response (response.choices[0].message.content)
  → send reply via Twilio REST API (client.messages.create)
  → record in messages table (both inbound + outbound)
  → increment usage_daily counters
  → if shared key: decrement user_credits.used_cents (estimate token cost)
  → return empty TwiML: <Response></Response>
```

### Provisioning
```
User clicks "Create assistant" → POST /api/v1/assistants
  → verify subscription active (subscriptions.status == ACTIVE)
  → check no existing assistant in PROVISIONING state (idempotent)
  → create provisioning_job (status=PENDING)
  → return 202 Accepted { "status": "PROVISIONING" }

Worker loop (poll every 5s):
  → pick oldest PENDING job → set RUNNING
  → select host_server with capacity
  → SSH to host server
  → allocate port (19000 + dense packing, or next available from DB)
  → docker run -d --name yourclaw-{user_id} \
      -p {port}:18789 \
      --memory=2g --cpus=1 \
      -v /data/yourclaw/{user_id}/config:/root/.openclaw \
      -v /data/yourclaw/{user_id}/workspace:/root/.openclaw/workspace \
      yourclaw-openclaw:latest
  → write openclaw config to /data/yourclaw/{user_id}/config/openclaw.json
  → health check: poll POST /v1/chat/completions with test message (retry 10x, 5s interval)
  → on success:
    → update assistants: status=READY, container_id, port
    → update host_servers: current_containers += 1
    → update provisioning_jobs: status=COMPLETED
    → send WhatsApp "Your assistant is ready!" via Twilio
  → on failure (after 3 attempts):
    → update provisioning_jobs: status=FAILED, last_error
    → update assistants: status=ERROR
    → docker rm -f yourclaw-{user_id}
    → cleanup config directory
```

### Stripe Payment
```
User clicks "Create assistant" (no subscription) → POST /api/v1/checkout
  → create Stripe Checkout Session:
    → mode: "subscription"
    → price: $20/month (Stripe Price ID from env)
    → metadata: { user_id }
    → success_url: APP_URL/dashboard?session_id={CHECKOUT_SESSION_ID}
    → cancel_url: APP_URL/dashboard
  → return { "checkout_url": session.url }
  → frontend redirects to Stripe Checkout

Stripe webhook → POST /api/v1/webhooks/stripe
  → validate Stripe signature (stripe.Webhook.construct_event)
  → handle events:
    → checkout.session.completed:
      → extract user_id from metadata
      → create subscription record (status=ACTIVE)
      → create user_credits (total_cents=1000, used_cents=0)
      → auto-trigger provisioning (create provisioning_job)
    → invoice.payment_succeeded:
      → renew subscription period
      → reset monthly credits (used_cents=0)
    → invoice.payment_failed:
      → update subscription status=PAST_DUE
      → (container keeps running for grace period)
    → customer.subscription.deleted:
      → update subscription status=CANCELED
      → stop container (docker stop + rm)
      → update assistant status=NONE
```

## Repo Structure
```
/apps/web                  — Next.js app (marketing + authenticated routes)
  /apps/web/src/app/(marketing)/     — Marketing pages (/, /features, /pricing)
  /apps/web/src/app/login/           — Login page (Google OAuth)
  /apps/web/src/app/onboarding/      — Onboarding page (phone number input)
  /apps/web/src/app/dashboard/       — Main dashboard with sidebar layout
  /apps/web/src/components/          — Catalyst UI components (button, sidebar, etc.)
  /apps/web/src/components/marketing/ — Marketing components (header, footer, mouse-gradient)
  /apps/web/src/lib/api.ts           — API client with types
/services/api              — FastAPI backend
  /services/api/app/
    main.py                — FastAPI app, CORS, middleware
    config.py              — Settings from env vars (pydantic BaseSettings)
    auth.py                — Supabase JWT validation middleware
    models.py              — SQLAlchemy/SQLModel ORM models
    schemas.py             — Pydantic request/response schemas
    /routers/
      users.py             — /users/me, /users/me/phone
      assistants.py        — /assistants CRUD + provisioning trigger
      checkout.py          — /checkout (Stripe session creation)
      api_keys.py          — /api-keys CRUD
      usage.py             — /usage stats
      webhooks.py          — /webhooks/twilio/whatsapp, /webhooks/stripe
    /services/
      container_service.py — Docker container lifecycle (create, destroy, health check)
      openclaw_client.py   — HTTP adapter for Openclaw chat completions API
      twilio_service.py    — Send WhatsApp messages, validate signatures
      stripe_service.py    — Checkout session, webhook handling
      encryption.py        — Fernet encrypt/decrypt for API keys + gateway tokens
      credits.py           — Credit tracking, cost estimation
    worker.py              — Provisioning job worker (polls DB, runs provisioning)
/infra/ansible             — Host server bootstrap (one-time: Docker, firewall, SSH)
/infra/docker              — Openclaw container config templates
/docs                      — Architecture, runbook, competitors
  /docs/architecture.md    — System diagrams, request flows
  /docs/runbook.md         — Common failures and fixes
  /docs/competitors.md     — Competitor analysis and positioning
.env.example               — All env vars with descriptions
docker-compose.yml         — Local dev: API only (connects to Supabase cloud)
```

## Data Model (Supabase Postgres)

Users managed by Supabase Auth (`auth.users`). App tables in `public` schema:

```sql
-- User's WhatsApp number
user_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 VARCHAR(20) NOT NULL,  -- e.g. +15551234567
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
)

-- User's Openclaw assistant (one per user)
assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'NONE',  -- NONE, PROVISIONING, READY, ERROR
  container_id VARCHAR(100),       -- Docker container ID
  host_server_id UUID REFERENCES host_servers(id),
  port INTEGER,                    -- mapped port on host (e.g. 19001)
  gateway_token_encrypted TEXT,    -- Fernet-encrypted gateway auth token
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
)

-- Host servers running user containers
host_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip VARCHAR(45) NOT NULL,
  ssh_key_ref VARCHAR(255) NOT NULL,  -- path or secret name
  max_containers INTEGER NOT NULL DEFAULT 20,
  current_containers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- Chat messages for audit + display
messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL,  -- INBOUND, OUTBOUND
  body TEXT NOT NULL,
  twilio_sid VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- Daily usage counters for rate limiting
usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  inbound_count INTEGER NOT NULL DEFAULT 0,
  outbound_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
)

-- User-provided API keys (BYOK)
api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL DEFAULT 'ANTHROPIC',  -- expandable
  encrypted_key TEXT NOT NULL,  -- Fernet encrypted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
)

-- Stripe subscriptions
subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, PAST_DUE, CANCELED
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
)

-- API credit balance (shared key usage)
user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL DEFAULT 1000,  -- $10.00 in cents
  used_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
)

-- Provisioning job queue
provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, RUNNING, COMPLETED, FAILED
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

## State Machines

### assistant.status
```
NONE → PROVISIONING → READY
         ↓               ↓
       ERROR          (user clicks recreate)
         ↓               ↓
       PROVISIONING ← NONE (destroy + reprovision)
```

### subscriptions.status
```
(none) → ACTIVE → PAST_DUE → CANCELED
                      ↓
                    ACTIVE (payment retry succeeds)
```

### provisioning_jobs.status
```
PENDING → RUNNING → COMPLETED
              ↓
            FAILED (retry up to 3 attempts, then stop)
```

## API Endpoints (FastAPI)

### Auth
- Supabase handles Google OAuth. Frontend uses `@supabase/supabase-js`.
- Backend validates Supabase JWT on every request via middleware.
- Supabase service role key used for admin DB operations.
- JWT passed as `Authorization: Bearer <token>` header.

### REST API (`/api/v1`)
```
# Health
GET    /health                        — service health + DB connectivity

# User
GET    /users/me                      — current user profile + phone + subscription status
POST   /users/me/phone                — set WhatsApp number { "phone": "+15551234567" }
  → validates E.164 format
  → upserts user_phones record

# Assistant
POST   /assistants                    — create/recreate assistant (idempotent per user)
  → requires active subscription
  → if existing assistant: destroy first, then reprovision
  → creates provisioning_job
  → returns 202 { "status": "PROVISIONING" }
GET    /assistants                    — get assistant status + basic info
  → returns { "status": "READY", "created_at": "...", "last_message_at": "..." }
DELETE /assistants                    — destroy assistant + container
  → stops container, removes config, sets status=NONE

# Payments
POST   /checkout                      — create Stripe Checkout session
  → returns { "checkout_url": "https://checkout.stripe.com/..." }
GET    /subscription                  — get subscription status + credits remaining
  → returns { "status": "ACTIVE", "credits_remaining_cents": 750, "current_period_end": "..." }

# API Keys (BYOK)
POST   /api-keys                      — store user's Anthropic key { "provider": "ANTHROPIC", "key": "sk-..." }
  → encrypts with Fernet, stores in DB
  → updates running container config (hot reload if possible, else recreate)
DELETE /api-keys                      — remove user's key, revert to shared key

# Usage
GET    /usage                         — usage stats
  → returns { "today": { "inbound": 12, "outbound": 12 }, "credits_used_cents": 250, ... }

# Webhooks (no auth — validated by signature)
POST   /webhooks/twilio/whatsapp      — Twilio inbound WhatsApp
  → validates X-Twilio-Signature
  → form-encoded: From, Body, MessageSid, ProfileName, NumMedia, MediaUrl0
POST   /webhooks/stripe               — Stripe events
  → validates Stripe-Signature header
  → handles: checkout.session.completed, invoice.payment_succeeded,
    invoice.payment_failed, customer.subscription.deleted
```

## Openclaw Container Config

Each container gets `~/.openclaw/openclaw.json` with full capabilities enabled:
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-5-20250929"
      },
      "contextTokens": 200000,
      "thinkingDefault": "low",
      "blockStreamingDefault": "on",
      "contextPruning": {
        "mode": "adaptive",
        "hardClearRatio": 0.5
      },
      "compaction": {
        "memoryFlush": { "enabled": true }
      }
    }
  },
  "gateway": {
    "mode": "local",
    "port": 18789,
    "auth": {
      "mode": "token",
      "token": "<generated-per-user-uuid4>"
    },
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  },
  "tools": {
    "profile": "full",
    "web": {
      "search": { "enabled": true },
      "fetch": { "enabled": true }
    },
    "media": {
      "image": { "enabled": true }
    }
  },
  "browser": {
    "enabled": true,
    "defaultProfile": "openclaw",
    "headless": true,
    "noSandbox": true,
    "attachOnly": false,
    "profiles": {
      "openclaw": {
        "cdpPort": 18800,
        "color": "#FF4500"
      }
    }
  }
}
```

### Configuration Breakdown

| Section | Setting | Purpose |
|---------|---------|---------|
| `agents.defaults.contextTokens` | 200000 | Maximum context window for Claude models |
| `agents.defaults.thinkingDefault` | "low" | Extended thinking for complex tasks |
| `agents.defaults.blockStreamingDefault` | "on" | Stream responses for better UX |
| `agents.defaults.contextPruning` | adaptive | Auto-manage token usage in long conversations |
| `agents.defaults.compaction.memoryFlush` | enabled | Efficient memory management |
| `tools.profile` | "full" | All tools enabled (fs, runtime, web, messaging) |
| `tools.web.search/fetch` | enabled | Web search and page fetching |
| `tools.media.image` | enabled | Image analysis via vision models |
| `browser.enabled` | true | Headless Chromium for web automation |
| `browser.defaultProfile` | "openclaw" | Use managed browser (not extension relay) |
| `browser.headless` | true | Run without display (containerized) |
| `browser.noSandbox` | true | Required for Docker containers |

### Tool Profiles Reference

OpenClaw supports 4 built-in tool profiles:
- **minimal**: `session_status` only
- **coding**: File system, runtime, sessions, memory, image
- **messaging**: Messaging tools + session management
- **full**: No restrictions (our default)

The Anthropic API key is set via environment variable `ANTHROPIC_API_KEY` on the container (not in config file). This makes it easy to swap between shared key and BYOK without rewriting config.

Openclaw gateway started with: `openclaw gateway --port 18789 --bind lan`

### Container Image

Custom image: `yourclaw-openclaw:latest` (built from `infra/docker/Dockerfile`)

Base: `node:22-bookworm` with:
- Chromium browser (for browser tool support)
- OpenClaw pre-installed globally
- All Puppeteer dependencies

Build on host server:
```bash
scp -r infra/docker/ root@$HOST_SERVER_IP:/tmp/yourclaw-docker/
ssh root@$HOST_SERVER_IP "cd /tmp/yourclaw-docker && chmod +x build.sh && ./build.sh"
```

### Container Directory Structure
```
/root/.openclaw/               # Openclaw config directory (mounted from host config/)
  openclaw.json                # Gateway config (auth token, model settings)
  workspace/                   # Openclaw's workspace (mounted from host workspace/)
    CLAUDE.md                  # System instructions (written by provisioner)
    USER.md                    # User profile (written by Openclaw)
    IDENTITY.md                # Assistant identity
    SOUL.md, AGENTS.md, etc.   # Openclaw standard files
    *.txt, *.md                # User data files
    .git/                      # Openclaw auto-initializes git

Host paths:
  /data/yourclaw/{user_id}/config/     → /root/.openclaw
  /data/yourclaw/{user_id}/workspace/  → /root/.openclaw/workspace
```

**IMPORTANT:** Openclaw writes to `/root/.openclaw/workspace/`, NOT the working directory. We mount the host workspace directly to this path.

### Memory System

Openclaw has TWO types of memory:

1. **Short-term (conversation context)**
   - Gateway API is stateless - each request is independent
   - We pass last 20 messages from DB with each request
   - Stored in `messages` table, fetched via `get_conversation_history()`

2. **Long-term (workspace files)**
   - Openclaw writes to `USER.md`, `IDENTITY.md`, etc. in workspace
   - Persists across sessions (workspace is mounted from host)
   - Openclaw manages this automatically when it decides to remember things
   - Files observed: USER.md (user profile), IDENTITY.md (assistant identity), custom data files

**Key insight:** The gateway API (`/v1/chat/completions`) is like OpenAI's API - stateless. We MUST pass conversation history ourselves. Openclaw's internal memory files are for longer-term persistent storage.

### System Instructions (CLAUDE.md)

Written to workspace on provisioning. Tells Openclaw:
- It's running on WhatsApp (don't suggest connecting to messaging apps)
- Don't mention CLI/terminal (user interacts via chat only)
- Keep responses concise for mobile

Located at: `/root/.openclaw/workspace/CLAUDE.md` in container

### Memory Persistence Behavior

| What | Persists Across Reprovisions? | Scope |
|------|------------------------------|-------|
| Workspace files (USER.md, IDENTITY.md) | Yes | Per user |
| Container state | No | Recreated each provision |
| Config (openclaw.json) | No | Regenerated with new settings |
| Conversation history | Yes | Stored in DB, passed to each request |

**To reset a user's long-term memory:**
```bash
rm -rf /data/yourclaw/{user_id}/workspace/*
docker restart $(docker ps -q --filter name=yourclaw-{user_id})
```

## Model Selection

Users can choose their AI model from the dashboard. Available models:

| Model ID | Display Name | Description |
|----------|--------------|-------------|
| `anthropic/claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | Fast and capable (default) |
| `anthropic/claude-opus-4-5-20251101` | Claude Opus 4.5 | Most powerful |
| `anthropic/claude-haiku-4-5-20251001` | Claude Haiku 4.5 | Fastest responses |

**Implementation:**
- Model stored in `assistants.model` column (DB migration: `003_assistant_model.sql`)
- Changed via PATCH `/api/v1/assistants` endpoint
- Triggers reprovisioning to apply new model
- Frontend shows model selector cards in Assistant section

**Flow:**
1. User clicks different model card in dashboard
2. Frontend calls `PATCH /api/v1/assistants { model: "..." }`
3. Backend updates DB, creates provisioning job
4. Worker recreates container with new model in config
5. Container restarts with new model

## MCP Servers / Integrations (KEY DIFFERENTIATOR)

MCP (Model Context Protocol) servers extend Openclaw's capabilities by connecting to external services. This is what makes YourClaw powerful - users get an AI assistant that can actually DO things, not just chat.

### Supported Integrations (MVP)
| Service | MCP Package | Capability |
|---------|-------------|------------|
| Google Calendar | `@anthropic/mcp-server-google-calendar` | Read/write calendar events |
| Gmail | `@anthropic/mcp-server-gmail` | Read/search/send emails |
| Google Drive | `@anthropic/mcp-server-google-drive` | Access files and folders |

### Implementation (COMPLETED)

**Database: `user_integrations` table**
```sql
user_integrations (
  user_id UUID,
  service VARCHAR(50),  -- 'GOOGLE_CALENDAR', 'GOOGLE_GMAIL', 'GOOGLE_DRIVE'
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  email VARCHAR(255),
  UNIQUE(user_id, service)
)
```

**OAuth Flow**
1. User clicks "Connect" button in Connected Services section (dashboard sidebar)
2. Frontend calls `GET /api/v1/oauth/google/{service}/connect` → returns Google OAuth URL
3. Frontend redirects to Google consent screen
4. User authorizes → Google redirects to `/api/v1/oauth/google/{service}/callback`
5. Backend exchanges code for tokens, stores encrypted in DB
6. Backend redirects to dashboard with `?connected={service}` query param
7. Container config updated with new MCP server, container restarted
8. Dashboard reloads integrations, shows connected email in green

**API Endpoints**
```
GET  /api/v1/oauth/google/{service}/connect  → { auth_url: "..." }
GET  /api/v1/oauth/google/{service}/callback → redirects to dashboard
GET  /api/v1/oauth/integrations              → { google_calendar: {...}, ... }
DELETE /api/v1/oauth/google/{service}        → disconnect service
```

**Container Config with MCP Servers**
```json
{
  "agents": { ... },
  "gateway": { ... },
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-google-calendar"],
      "env": {
        "GOOGLE_ACCESS_TOKEN": "ya29.xxx"
      }
    },
    "google-gmail": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-gmail"],
      "env": {
        "GOOGLE_ACCESS_TOKEN": "ya29.xxx"
      }
    }
  }
}
```

**Token Refresh**
- Google access tokens expire in 1 hour
- Tokens refreshed on-demand when fetching integrations
- Worker refreshes tokens before provisioning if expiring soon
- Uses refresh_token to get new access_token via Google OAuth API

### Security
- OAuth tokens encrypted at rest (Fernet)
- Tokens injected into config at provisioning/update time
- User can disconnect from dashboard (revokes access)
- Same Google Cloud project as Supabase auth (separate OAuth client)

### Environment Variables
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

### Files
- `services/api/app/routers/oauth.py` - OAuth endpoints
- `services/api/app/services/container_service.py` - MCP config injection
- `supabase/migrations/002_user_integrations.sql` - DB migration

## LLM API Key Strategy
- **Shared key**: We provide an Anthropic API key. Each user gets $10 credit (1000 cents) after subscribing ($20/mo).
- **BYOK**: User adds their own Anthropic key in dashboard for unlimited usage. No credit tracking when BYOK is active.
- **Modular**: `api_keys` table has `provider` column. Only `ANTHROPIC` for MVP.
- **Key injection**: Set as `ANTHROPIC_API_KEY` env var on the Docker container.
- **Key switching**: When user adds/removes BYOK key, update container env var (may require container restart).
- **Encryption**: User keys encrypted with Fernet. Master key in `ENCRYPTION_KEY` env var.
- **Credit estimation**: Rough token-to-cost mapping. MVP: estimate ~$0.003 per message pair (in+out). Hooks in place for exact Anthropic usage API later.

## Stripe Integration
- **Model**: Monthly subscription ($20/mo) via Stripe Checkout
- **Credits**: $10/mo in API credits included (reset each billing cycle)
- **Product setup**: One Stripe Product with one Price ($20/month recurring)
- **Checkout flow**: Backend creates Stripe Checkout Session → frontend redirects → user pays → webhook confirms
- **Webhook events handled**:
  - `checkout.session.completed` → create subscription + credits + trigger provisioning
  - `invoice.payment_succeeded` → renew period, reset credits
  - `invoice.payment_failed` → mark PAST_DUE (grace period, container keeps running)
  - `customer.subscription.deleted` → mark CANCELED, stop container
- **Webhook security**: Validate `Stripe-Signature` header using `stripe.Webhook.construct_event()`
- **Idempotency**: Stripe event IDs stored to prevent double-processing
- **Mock mode**: `MOCK_STRIPE=true` skips payment, auto-creates subscription for dev

## Environment Variables
```
# Supabase
SUPABASE_URL=                       # https://xxxxx.supabase.co
SUPABASE_ANON_KEY=                  # public anon key (safe for frontend)
SUPABASE_SERVICE_ROLE_KEY=          # secret service role key (backend only)

# Twilio
TWILIO_ACCOUNT_SID=                 # ACxxxxxxxx
TWILIO_AUTH_TOKEN=                  # secret auth token
TWILIO_WHATSAPP_NUMBER=             # whatsapp:+14155238886

# Stripe
STRIPE_SECRET_KEY=                  # sk_live_xxx or sk_test_xxx
STRIPE_PUBLISHABLE_KEY=            # pk_live_xxx or pk_test_xxx
STRIPE_WEBHOOK_SECRET=             # whsec_xxx
STRIPE_PRICE_ID=                   # price_xxx ($20/month subscription)

# Hetzner Host Server
HOST_SERVER_IP=                     # IP of the Docker host server
HOST_SERVER_SSH_KEY_PATH=           # path to SSH private key

# Shared LLM Key
ANTHROPIC_API_KEY=                  # shared Anthropic key for all users

# Google OAuth (for integrations)
GOOGLE_CLIENT_ID=                   # xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=               # GOCSPX-xxx

# Security
ENCRYPTION_KEY=                     # Fernet key for encrypting user API keys + gateway tokens

# App URLs
API_URL=                            # https://api.yourclaw.com
APP_URL=                            # https://yourclaw.com (single app for marketing + dashboard)

# Rate Limits
RATE_LIMIT_MSG_PER_MIN=5            # per user
RATE_LIMIT_MSG_PER_DAY=100          # per user

# Worker
WORKER_POLL_INTERVAL=5              # seconds between job polls
WORKER_MAX_ATTEMPTS=3               # max provisioning retries

# Mock Mode (local dev)
MOCK_TWILIO=false                   # true: log instead of sending WhatsApp
MOCK_CONTAINERS=false               # true: simulate container provisioning
MOCK_STRIPE=false                   # true: skip payment, auto-create subscription
```

## Conventions
- **Python**: snake_case, type hints, Pydantic models for request/response
- **TypeScript**: camelCase for variables, PascalCase for components, kebab-case for files
- **API**: `/api/v1/` prefix, JSON responses, `{ "detail": "..." }` for errors
- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Secrets**: never logged, never in client code, encrypted at rest in DB
- **Idempotency**: provisioning endpoint is idempotent per user
- **Structured logging**: JSON logs with user_id, request_id, action context
- **Error format**: `{ "detail": "Human-readable message", "code": "MACHINE_CODE" }`

## Security
- Twilio webhook signature validation (`X-Twilio-Signature`, HMAC-SHA1 with auth token)
- Stripe webhook signature validation (`Stripe-Signature` header)
- Supabase JWT validation on every API request (middleware)
- Fernet encryption for stored API keys and gateway tokens
- Host server: SSH key only, firewall restricts container ports to backend IP
- Rate limiting on webhook endpoint (IP-based + user-based)
- No secrets in frontend code; all sensitive ops server-side
- Container isolation: non-root user, memory/CPU limits, no --privileged
- Structured logs: never log secrets, API keys, or tokens

## Local Dev
```bash
# 1. Clone and install frontend deps
cd apps/web
pnpm install

# 2. Copy env
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL_OVERRIDE
# Set: MOCK_TWILIO=true, MOCK_CONTAINERS=true, MOCK_STRIPE=true

# 3. Install backend deps (uv)
cd services/api
uv sync

# 4. Start backend (mock mode)
MOCK_TWILIO=true MOCK_CONTAINERS=true MOCK_STRIPE=true uv run uvicorn app.main:app --reload --port 8000

# 5. Start worker (mock mode — simulates provisioning)
cd services/api
MOCK_CONTAINERS=true uv run python -m app.worker

# 6. Start frontend (includes marketing + app)
cd apps/web
pnpm dev  # port 3000 — serves /, /features, /pricing, /login, /dashboard, etc.
```

## Tech Stack Summary
| Layer | Technology |
|-------|-----------|
| Marketing site | Next.js 15 + Tailwind (dark theme, animated gradients, mouse effects) |
| App frontend | Next.js 15 + Tailwind + Catalyst UI + @supabase/supabase-js |
| UI Components | Catalyst (Tailwind UI) + Headless UI + Heroicons |
| Backend API | FastAPI + SQLAlchemy + Pydantic |
| Database | Supabase Postgres (cloud) |
| Auth | Supabase Auth (Google OAuth) |
| Payments | Stripe (Checkout + Subscriptions + Webhooks) |
| Containers | Docker on Hetzner CX41 host |
| AI runtime | Openclaw (npm, gateway mode) |
| LLM | Anthropic Claude (Sonnet 4.5 default) |
| WhatsApp | Twilio Business API |
| Encryption | Fernet (cryptography lib) |
| Package manager | pnpm (monorepo, JS/TS) |
| Python deps | uv + pyproject.toml |

## Agent Responsibilities (for multi-agent builds)

### Frontend Agent — /apps/web
- Marketing pages (route group `(marketing)`):
  - `/` — Landing page with hero, how it works, features, pricing, FAQ
  - `/features` — Full features page with integrations + capabilities
  - `/pricing` — Pricing page with comparison table + FAQ
- Auth + App pages:
  - `/login` — Google sign-in via Supabase
  - `/onboarding` — WhatsApp number input, E.164 validation
  - `/dashboard` — Sidebar layout with sections:
    - Assistant section (status, create/delete)
    - Connected Services section (Google Calendar, Gmail, Drive OAuth)
    - Usage section (messages, credits, account info)
    - Profile dropdown in sidebar footer (settings, sign out)
- Stripe Checkout redirect (from /checkout endpoint)
- All API calls go to FastAPI backend
- Uses Catalyst UI components (Button, Badge, Sidebar, Dropdown, etc.)

### Backend Agent — /services/api
- FastAPI app with all routers and services
- Supabase JWT auth middleware
- Stripe Checkout + webhook handling
- Twilio webhook + message routing
- Openclaw HTTP API adapter
- Container provisioning worker
- Rate limiting + credit tracking
- Encryption service

## Current Progress

### Completed
- [x] Architecture decisions locked (see above)
- [x] CLAUDE.md written with full spec
- [x] `.env.example` with all env vars
- [x] `services/api/pyproject.toml` (uv, all Python deps)
- [x] `services/api/app/config.py` — Pydantic BaseSettings from env
- [x] `services/api/app/database.py` — Supabase Data API client (REST, not direct Postgres)
- [x] `supabase/migrations/001_initial_schema.sql` — all 8 tables SQL migration
- [x] `services/api/app/schemas.py` — Pydantic request/response for all endpoints
- [x] `services/api/app/auth.py` — Supabase JWT validation middleware (+ DEV_USER_ID bypass)
- [x] `services/api/app/main.py` — FastAPI app with CORS, health endpoint, routers registered
- [x] All routers: users, assistants, checkout, api_keys, usage, webhooks
- [x] `services/encryption.py` — Fernet encrypt/decrypt
- [x] Twilio + Stripe + Openclaw client integrated in routers
- [x] Frontend `/apps/web`: Next.js + Supabase auth + /login, /onboarding, /dashboard
- [x] API tested and working with real Supabase auth
- [x] `services/container_service.py` — SSH to host, docker run, health check
- [x] `worker.py` — polls provisioning_jobs, creates containers, updates status
- [x] Host server configured (Docker installed, SSH access, firewall rules)
- [x] End-to-end provisioning working (worker → SSH → docker run → Openclaw → health check passes)
- [x] WhatsApp inbound working (Twilio webhook → backend → Openclaw container responds)
- [x] Signature validation handles proxy/ngrok headers (X-Forwarded-Proto, X-Forwarded-Host)
- [x] Added `SKIP_TWILIO_SIGNATURE=true` setting for local dev (skips signature check)
- [x] Added error handling to prevent Twilio webhook retries on send failure
- [x] WhatsApp sandbox working end-to-end (TwiML inline response mode)
- [x] Auto-detection of sandbox vs production mode in webhook handler
- [x] Conversation history passed to Openclaw (last 20 messages from DB)
- [x] System instructions (`CLAUDE.md`) written to workspace on provisioning
- [x] Workspace mounted to `/root/.openclaw/workspace` (where Openclaw actually writes)
- [x] Openclaw file persistence working (USER.md, IDENTITY.md, custom files)
- [x] Tool use verified working (read, write, exec tools)
- [x] **MCP Servers / Google Integrations (backend)**:
  - [x] `supabase/migrations/002_user_integrations.sql` — OAuth tokens table
  - [x] `services/api/app/routers/oauth.py` — OAuth flow endpoints (connect, callback, list, disconnect)
  - [x] `services/api/app/services/container_service.py` — MCP config injection + update_config method
  - [x] `services/api/app/worker.py` — fetches integrations, passes to container creation
  - [x] Token refresh logic (on-demand when tokens expire)
  - [x] Config updated + container restarted when user connects/disconnects services
- [x] **Catalyst UI Components** (frontend):
  - [x] Installed: @headlessui/react, motion, clsx, @heroicons/react
  - [x] Catalyst components in `apps/web/src/components/`
  - [x] Link component updated for Next.js integration
  - [x] Inter font configured in layout + globals.css
- [x] **Dashboard redesign with sidebar layout**:
  - [x] SidebarLayout with navigation (Assistant, Connected Services, Usage)
  - [x] Profile dropdown in sidebar footer (avatar, username, phone, sign out)
  - [x] Section-based content switching
  - [x] Connected Services UI with connect/disconnect buttons
  - [x] Responsive mobile navigation (hamburger menu)
- [x] **Browser support (Chromium)**:
  - [x] Custom Docker image `yourclaw-openclaw:latest` with Chromium pre-installed
  - [x] `infra/docker/Dockerfile` — node:22-bookworm + Chromium + Puppeteer deps
  - [x] `infra/docker/build.sh` — build script for host server
  - [x] Browser config in openclaw.json (`defaultProfile: "openclaw"`, `headless: true`, `noSandbox: true`)
  - [x] Verified working: OpenClaw can browse web, take screenshots, automate pages
- [x] **Model selection**:
  - [x] `supabase/migrations/003_assistant_model.sql` — model column on assistants table
  - [x] `services/api/app/schemas.py` — AVAILABLE_MODELS, AssistantUpdateInput
  - [x] `services/api/app/routers/assistants.py` — PATCH endpoint for model updates
  - [x] `services/api/app/worker.py` — fetches model from DB, passes to container
  - [x] `apps/web/src/lib/api.ts` — model constants, updateAssistant API call
  - [x] `apps/web/src/app/dashboard/page.tsx` — model selector cards UI
  - [x] Changing model triggers reprovisioning
- [x] **Full OpenClaw configuration**:
  - [x] `tools.profile: "full"` — all tools enabled
  - [x] `contextTokens: 200000` — max context for Claude
  - [x] `thinkingDefault: "low"` — extended thinking enabled
  - [x] `contextPruning: adaptive` — auto-manage long conversations
  - [x] `web.search/fetch enabled` — web access
  - [x] `media.image enabled` — image analysis

### WhatsApp: Sandbox vs Production Mode (IMPORTANT)

**Current status:** Using Twilio Sandbox for testing. Production number `+15557589499` pending Meta approval.

**Sandbox mode (current):**
- Sandbox number: `+14155238886`
- Replies MUST use **TwiML inline response** (not REST API)
- REST API calls fail with error 63015 (session window)
- Code auto-detects sandbox via `+14155238886` in `to_number`

**Production mode (after Meta approval):**
- Use the approved WhatsApp Business number
- Replies use **Twilio REST API** (`client.messages.create()`)
- TwiML inline won't work for production (needs REST API for async replies)

**How it works in code (`webhooks.py`):**
```python
is_sandbox = "+14155238886" in to_number

if is_sandbox:
    # Return TwiML inline (sandbox only)
    return Response(content=f"<Response><Message>{reply}</Message></Response>", ...)
else:
    # Send via REST API (production)
    await send_twilio_message(from_number, reply, to_number)
    return Response(content="<Response></Response>", ...)
```

**When Meta approves production number:**
1. Update `.env`: `TWILIO_WHATSAPP_NUMBER=whatsapp:+15557589499`
2. Set Twilio webhook URL for production number (not sandbox)
3. Code will auto-switch to REST API mode (no code changes needed)

**Sandbox setup (for testing):**
1. Join sandbox: send join code to `+14155238886` from your WhatsApp
2. Set sandbox webhook URL to ngrok URL in Twilio Console → Messaging → Try WhatsApp
3. Code auto-detects sandbox and uses TwiML response

**Sandbox limitation: 15-second timeout**
- Twilio webhooks timeout after ~15 seconds
- Sandbox requires TwiML inline response (synchronous)
- If Openclaw takes >15s to respond, Twilio closes connection and discards the reply
- **This is a dev-only limitation** - production REST API is async (no timeout)
- No workaround for sandbox. Accept some messages won't arrive if LLM is slow.

### Next Steps (in order)
1. **MCP Servers / Integrations** (KEY DIFFERENTIATOR): ✅ DONE
   - [x] Research Openclaw MCP server configuration
   - [x] Identify key MCP servers for MVP: Calendar, Gmail, Drive
   - [x] Design user OAuth flow for connecting services
   - [x] Add MCP config to container provisioning
   - [x] Store MCP credentials securely (encrypted in DB)
   - [x] Token refresh logic
   - [x] API endpoints: connect, callback, list, disconnect
   - [x] Frontend: "Connected Services" UI in dashboard (sidebar layout)
   - [ ] Test with real Google OAuth credentials
2. **Wait for Meta WhatsApp approval** (production number `+15557589499`)
3. **Marketing site**: ✅ DONE (consolidated into `/apps/web`)
   - [x] Competitor analysis (15+ competitors analyzed in `/docs/competitors.md`)
   - [x] Landing page at `/` with hero, how it works, features, pricing, FAQ
   - [x] Features page at `/features` with integrations + capabilities
   - [x] Pricing page at `/pricing` with comparison table + FAQ
   - [x] Shared marketing components (header, footer)
   - [x] Updated login/onboarding pages to match new design
   - [x] **Dark theme redesign** with premium aesthetics:
     - Dark zinc-950 background throughout
     - Animated gradient orbs and pulse effects
     - Mouse-following gradient cursor effect
     - Spotlight cards with mouse tracking
     - Tilt effect on interactive elements (pricing card, phone mockup)
     - Premium iPhone mockup with Dynamic Island
     - Calendar conversation demo (view meetings → reschedule → confirmation)
     - Typing indicator animation with progressive message reveal
     - OpenClaw branding integrated throughout
     - Glassmorphism + gradient borders on cards
     - Smooth reveal animations on scroll
     - Grid pattern background overlay
   - [x] **Interactive hero section** with instant setup:
     - AI model selector (Claude active, GPT-4/Gemini "coming soon")
     - Phone number input with US formatting
     - "Continue with Google" button triggers OAuth flow
     - Stores phone/model in localStorage for post-auth processing
     - All CTAs scroll to top (interactive setup)
   - [x] **Use cases marquee section**:
     - 24 use case pills from OpenClaw capabilities
     - 3 rows with different scroll directions/speeds
     - Animated marquee with pause on hover
     - Mix of filled and dashed-outline styles
4. **Production deployment**:
   - [ ] Deploy API to production (Hetzner or similar)
   - [ ] Deploy frontend to Vercel
   - [ ] Configure real Twilio + Stripe webhooks
   - [ ] Fix Twilio signature validation for production (currently using SKIP_TWILIO_SIGNATURE)
   - [ ] Set up monitoring/logging
5. **Verify remaining flows**:
   - [ ] Rate limiting + credit tracking
   - [ ] Stripe checkout + subscription flow

### Working Style
- Step by step, building block by building block
- Each block reviewed by user before moving to next
- Keep changes small and reviewable

## Scaling Notes (Post-MVP)
- Add more host servers → host_servers table tracks capacity, worker selects by available slots
- Migrate to Docker Swarm or K8s for container orchestration
- Add Redis for rate limiting at scale
- Add proper job queue (Celery/BullMQ) if provisioning volume grows
- Token-level metering via Anthropic API usage callbacks (replace per-message estimation)
- Multiple Twilio numbers via Senders API for per-user branding
- Stripe metered billing for usage-based pricing
