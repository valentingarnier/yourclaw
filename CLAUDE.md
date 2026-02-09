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
- **Container image**: Custom `yourclaw-openclaw:latest` (lightweight gateway) + `openclaw-sandbox-browser:bookworm-slim` (browser tool)
- **Openclaw install**: Pre-installed in container image, starts with `openclaw gateway`
- **Job queue**: DB-backed (`provisioning_jobs` table + Python worker polling). No Redis/Celery for MVP. Low traffic assumed.
- **LLM providers**: Anthropic, OpenAI, Google. Shared API keys for MVP, BYOK supported (users can add their own keys from dashboard).
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
13. Dashboard shows "Your assistant is ready!" with instructions to message the Twilio number
14. User messages the Twilio WhatsApp number first (initiates 24-hour session window)
15. Twilio webhook → backend routes to user's container → gets reply → sends back
16. Usage tracked per day. Rate limits enforced. [TODO: implement rate limits]
```

## Request Flows

### WhatsApp Message
```
User WhatsApp → Twilio → POST /api/v1/webhooks/twilio/whatsapp (FastAPI)
  → validate Twilio signature (X-Twilio-Signature, HMAC-SHA1)
  → parse Form data: From, Body, MessageSid, ProfileName, NumMedia, MediaUrl0
  → lookup user by From phone (strip "whatsapp:" prefix, match E.164)
  → check assistant status == READY
  → check rate limits (msg/min) + daily caps (msg/day) [TODO: implement]
  → POST /v1/chat/completions on user container (host_ip:user_port)
    → Authorization: Bearer <gateway_token>
    → body: { "model": "openclaw:main", "messages": [{"role": "user", "content": "<body>"}] }
  → get response (response.choices[0].message.content)
  → send reply via Twilio REST API (client.messages.create)
  → record in messages table (both inbound + outbound)
  → increment usage_daily counters
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
      -v /var/run/docker.sock:/var/run/docker.sock \
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
      → auto-trigger provisioning (create provisioning_job)
    → invoice.payment_succeeded:
      → renew subscription period
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
/frontend                  — Next.js app (marketing + authenticated routes)
  /frontend/src/app/(marketing)/     — Marketing pages (/, /pricing, /privacy, /terms)
  /frontend/src/app/login/           — Login page (Google OAuth)
  /frontend/src/app/onboarding/      — Onboarding page (phone number input)
  /frontend/src/app/dashboard/       — Main dashboard with sidebar layout
  /frontend/src/components/          — Catalyst UI components (button, sidebar, etc.)
  /frontend/src/components/marketing/ — Marketing components (header, footer, mouse-gradient)
  /frontend/src/lib/api.ts           — API client with types
/backend                   — FastAPI backend
  /backend/app/
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

-- API credit balance (NOT CURRENTLY USED - table exists but no logic implemented)
-- TODO: Decide if we're using credits system or just rate limits for MVP
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
  → sets status=NONE (keeps container_id for worker cleanup)
  → worker detects status=NONE and stops container via SSH

# Payments
POST   /checkout                      — create Stripe Checkout session
  → returns { "checkout_url": "https://checkout.stripe.com/..." }
GET    /subscription                  — get subscription status
  → returns { "status": "ACTIVE", "current_period_end": "..." }

# API Keys (BYOK) - UI not exposed yet
POST   /api-keys                      — store user's Anthropic key { "provider": "ANTHROPIC", "key": "sk-..." }
  → encrypts with Fernet, stores in DB
  → updates running container config (hot reload if possible, else recreate)
DELETE /api-keys                      — remove user's key, revert to shared key

# Usage
GET    /usage                         — usage stats
  → returns { "today": { "inbound": 12, "outbound": 12 }, ... }

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

Each container gets `~/.openclaw/openclaw.json` with full capabilities including browser automation via Playwright MCP.

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
    "deny": ["browser", "playwright_browser_install"],
    "web": {
      "search": { "enabled": true },
      "fetch": { "enabled": true }
    },
    "media": {
      "image": { "enabled": true }
    }
  },
  "plugins": {
    "entries": {
      "openclaw-mcp-adapter": {
        "enabled": true,
        "config": {
          "servers": [
            {
              "name": "playwright",
              "transport": "stdio",
              "command": "npx",
              "args": ["-y", "@playwright/mcp@latest", "--browser", "chromium", "--headless", "--executable-path", "/usr/bin/chromium"]
            }
          ]
        }
      }
    }
  },
  "browser": {
    "enabled": false
  },
  "commands": {
    "restart": true
  }
}
```

### Browser Automation via Playwright MCP

Browser automation uses Microsoft's [Playwright MCP server](https://github.com/microsoft/playwright-mcp) via the `openclaw-mcp-adapter` plugin.

**How it works:**
1. OpenClaw loads the `openclaw-mcp-adapter` plugin at startup
2. Plugin connects to Playwright MCP server via stdio
3. Playwright uses the system Chromium (installed in container)
4. 22 browser tools are registered: navigate, click, fill_form, screenshot, etc.

**Available browser tools:**
| Tool | Description |
|------|-------------|
| `playwright_browser_navigate` | Go to a URL |
| `playwright_browser_click` | Click an element |
| `playwright_browser_fill_form` | Fill form fields |
| `playwright_browser_type` | Type text |
| `playwright_browser_snapshot` | Get page accessibility tree |
| `playwright_browser_take_screenshot` | Capture screenshot |
| `playwright_browser_tabs` | Manage browser tabs |
| + 15 more | hover, drag, select, evaluate JS, etc. |

**Key advantage:** Uses accessibility tree, not screenshots — more reliable and doesn't require vision models.

### Configuration Breakdown

| Section | Setting | Purpose |
|---------|---------|---------|
| `agents.defaults.contextTokens` | 200000 | Maximum context window for Claude models |
| `agents.defaults.thinkingDefault` | "low" | Extended thinking for complex tasks |
| `agents.defaults.blockStreamingDefault` | "on" | Stream responses for better UX |
| `agents.defaults.compaction.memoryFlush` | enabled | Efficient memory management |
| `tools.profile` | "full" | All tools enabled (fs, runtime, web, messaging) |
| `tools.deny` | ["browser", "playwright_browser_install"] | Remove native browser + install tool from LLM's tool list |
| `tools.web.search/fetch` | enabled | Web search and page fetching |
| `tools.media.image` | enabled | Image analysis via vision models |
| `browser.enabled` | false | Disable native browser control service (Chrome extension relay) |
| `plugins.entries.openclaw-mcp-adapter` | enabled | Playwright browser automation (22 tools) |

### Tool Profiles Reference

OpenClaw supports 4 built-in tool profiles:
- **minimal**: `session_status` only
- **coding**: File system, runtime, sessions, memory, image
- **messaging**: Messaging tools + session management
- **full**: No restrictions (our default)

LLM API keys are set via environment variables on the container (not in config file): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`. This makes it easy to swap between shared keys and BYOK without rewriting config.

Openclaw gateway started with: `openclaw gateway --port 18789 --bind lan`

### Container Image

**Single full-featured image:** `yourclaw-openclaw:latest` (from `infra/docker/Dockerfile`)

Includes:
- Base: `node:22-bookworm-slim`
- System: git, curl, ca-certificates
- Browser: Chromium + all dependencies (fonts, libs)
- Runtime: OpenClaw, `@playwright/mcp`
- Plugin: `openclaw-mcp-adapter` (for MCP server integration)

**Build and deploy:**
```bash
scp -r infra/docker/ root@$HOST_SERVER_IP:/tmp/yourclaw-docker/
ssh root@$HOST_SERVER_IP "cd /tmp/yourclaw-docker && docker build -t yourclaw-openclaw:latest -f Dockerfile ."
```

**For new containers:** Copy the MCP adapter plugin to user config:
```bash
mkdir -p /data/yourclaw/{user_id}/config/extensions
docker run --rm -v /data/yourclaw/{user_id}/config/extensions:/host yourclaw-openclaw:latest \
  cp -r /root/.openclaw/extensions/openclaw-mcp-adapter /host/
```

**Common error if Docker CLI missing:**
```
[openclaw] Uncaught exception: Error: spawn docker ENOENT
```
This means gateway container is missing Docker CLI. Rebuild the image.

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
| `openai/gpt-4o` | GPT-4o | OpenAI's flagship model |
| `openai/gpt-4o-mini` | GPT-4o Mini | Fast and affordable |
| `google/gemini-2.0-flash` | Gemini 2.0 Flash | Google's fast model |
| `google/gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite | Lightweight and fast |

**Implementation:**
- Model stored in `assistants.model` column (DB migration: `003_assistant_model.sql`)
- Changed via PATCH `/api/v1/assistants` endpoint
- Triggers reprovisioning to apply new model
- Frontend shows model selector cards in Assistant section
- All LLM API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY) passed to containers

**Flow:**
1. User clicks different model card in dashboard
2. Frontend calls `PATCH /api/v1/assistants { model: "..." }`
3. Backend updates DB, creates provisioning job
4. Worker recreates container with new model in config
5. Container restarts with new model

## MCP Servers / Integrations (PAUSED - Post-Launch)

> **Status**: Backend complete, frontend hidden. Google OAuth not verified for production.
> Will re-enable after launch when Google OAuth app is verified.

MCP (Model Context Protocol) servers extend Openclaw's capabilities by connecting to external services. This is what makes YourClaw powerful - users get an AI assistant that can actually DO things, not just chat.

### Planned Integrations (Post-Launch)
| Service | MCP Package | Capability |
|---------|-------------|------------|
| Google Calendar | `@anthropic/mcp-server-google-calendar` | Read/write calendar events |
| Gmail | `@anthropic/mcp-server-gmail` | Read/search/send emails |
| Google Drive | `@anthropic/mcp-server-google-drive` | Access files and folders |

### Implementation (Backend Complete, UI Hidden)

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
- `backend/app/routers/oauth.py` - OAuth endpoints
- `backend/app/services/container_service.py` - MCP config injection
- `supabase/migrations/002_user_integrations.sql` - DB migration

## LLM API Key Strategy

### Current State (Production)
- **Multi-provider support**: Anthropic, OpenAI, and Google keys supported
- **Shared keys**: Default keys for all providers set via environment variables on containers
- **BYOK implemented**: Users can add their own API keys from Dashboard → API Keys section
- **No credits system**: Simple $20/month subscription with shared API keys

### BYOK (Bring Your Own Key)

Users can add their own API keys for any provider from the dashboard:

**Supported providers:**
- `ANTHROPIC` — for Claude models
- `OPENAI` — for GPT models
- `GOOGLE` — for Gemini models

**How it works:**
1. User goes to Dashboard → API Keys
2. User enters their API key for any provider
3. Backend encrypts key with Fernet, stores in `api_keys` table
4. If assistant is READY, triggers reprovisioning automatically
5. Worker fetches all BYOK keys, uses them instead of shared keys
6. Container starts with user's own API keys

**API Endpoints:**
```
GET    /api/v1/api-keys              — list user's keys (provider + created_at, no values)
POST   /api/v1/api-keys              — add key { provider, key } → triggers reprovision
DELETE /api/v1/api-keys/{provider}   — remove key → triggers reprovision (reverts to shared)
```

**Key priority:** BYOK key > shared key (per provider)

### Technical Details
- **Key injection**: Set as env vars on Docker container (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`)
- **Key switching**: Adding/removing BYOK key triggers reprovisioning (container recreated with new keys)
- **Encryption**: User keys encrypted with Fernet. Master key in `ENCRYPTION_KEY` env var
- **Security**: Keys never exposed in API responses, only provider name and created_at returned

## Stripe Integration (COMPLETE)
- **Model**: Monthly subscription ($20/mo) via Stripe Checkout
- **Product setup**: One Stripe Product with one Price ($20/month recurring)
- **Checkout flow**: Backend creates Stripe Checkout Session → frontend redirects → user pays → webhook confirms
- **Webhook events handled**:
  - `checkout.session.completed` → create subscription + trigger provisioning
  - `invoice.payment_succeeded` → renew subscription period
  - `invoice.payment_failed` → mark PAST_DUE (grace period, container keeps running)
  - `customer.subscription.deleted` → mark CANCELED, stop container
- **Webhook security**: Validate `Stripe-Signature` header using `stripe.Webhook.construct_event()`
- **Local testing**: Use Stripe CLI (`stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`)
- **Test card**: `4242 4242 4242 4242` with any future date and CVC
- **Mock mode**: `MOCK_STRIPE=true` skips payment, auto-creates subscription for dev

**Note**: Credits system is NOT implemented. Website now shows simple $20/month pricing without credits mention.

**Stripe Test Credentials (configured in .env):**
- Product: YourClaw Pro ($20/month)
- Price ID: `price_1SyZSbCFAYv3UO1LWxf67wDW`

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

# Shared LLM Keys
ANTHROPIC_API_KEY=                  # shared Anthropic key for all users
OPENAI_API_KEY=                     # shared OpenAI key for GPT models
GOOGLE_API_KEY=                     # shared Google key for Gemini models

# Google OAuth (for integrations)
GOOGLE_CLIENT_ID=                   # xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=               # GOCSPX-xxx

# Resend (waitlist emails)
RESEND_API_KEY=                     # re_xxx (from resend.com)

# Security
ENCRYPTION_KEY=                     # Fernet key for encrypting user API keys + gateway tokens

# App URLs
API_URL=                            # https://yourclaw.onrender.com (Render)
APP_URL=                            # https://www.yourclaw.dev (Vercel - marketing + dashboard)

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
cd frontend
pnpm install

# 2. Copy env
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL_OVERRIDE
# Set: MOCK_TWILIO=true, MOCK_CONTAINERS=true, MOCK_STRIPE=true

# 3. Install backend deps (uv)
cd backend
uv sync

# 4. Start backend (mock mode)
MOCK_TWILIO=true MOCK_CONTAINERS=true MOCK_STRIPE=true uv run uvicorn app.main:app --reload --port 8000

# 5. Start worker (mock mode — simulates provisioning)
cd backend
MOCK_CONTAINERS=true uv run python -m app.worker

# 6. Start frontend (includes marketing + app)
cd frontend
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

### Frontend Agent — /frontend
- Marketing pages (route group `(marketing)`):
  - `/` — Landing page with hero, time comparison, features, pricing, FAQ
  - `/pricing` — Pricing page with comparison table + FAQ
  - `/privacy`, `/terms` — Legal pages
- Auth + App pages:
  - `/login` — Google sign-in via Supabase
  - `/onboarding` — WhatsApp number input, E.164 validation
  - `/dashboard` — Sidebar layout with sections:
    - Assistant section (status, create/delete, model selection)
    - API Keys section (BYOK - add/remove keys for Anthropic, OpenAI, Google)
    - Usage section (messages, account info)
    - Profile dropdown in sidebar footer (settings, sign out)
    - Connected Services section (HIDDEN - waiting for Google OAuth verification)
- Stripe Checkout redirect (from /checkout endpoint)
- All API calls go to FastAPI backend
- Uses Catalyst UI components (Button, Badge, Sidebar, Dropdown, etc.)

### Backend Agent — /backend
- FastAPI app with all routers and services
- Supabase JWT auth middleware
- Stripe Checkout + webhook handling
- Twilio webhook + message routing
- Openclaw HTTP API adapter
- Container provisioning worker
- Rate limiting (TODO: implement)
- Encryption service

## Current Progress

### Completed
- [x] Architecture decisions locked (see above)
- [x] CLAUDE.md written with full spec
- [x] `.env.example` with all env vars
- [x] `backend/pyproject.toml` (uv, all Python deps)
- [x] `backend/app/config.py` — Pydantic BaseSettings from env
- [x] `backend/app/database.py` — Supabase Data API client (REST, not direct Postgres)
- [x] `supabase/migrations/001_initial_schema.sql` — all 8 tables SQL migration
- [x] `backend/app/schemas.py` — Pydantic request/response for all endpoints
- [x] `backend/app/auth.py` — Supabase JWT validation middleware (+ DEV_USER_ID bypass)
- [x] `backend/app/main.py` — FastAPI app with CORS, health endpoint, routers registered
- [x] All routers: users, assistants, checkout, api_keys, usage, webhooks
- [x] `services/encryption.py` — Fernet encrypt/decrypt
- [x] Twilio + Stripe + Openclaw client integrated in routers
- [x] Frontend `/frontend`: Next.js + Supabase auth + /login, /onboarding, /dashboard
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
  - [x] `backend/app/routers/oauth.py` — OAuth flow endpoints (connect, callback, list, disconnect)
  - [x] `backend/app/services/container_service.py` — MCP config injection + update_config method
  - [x] `backend/app/worker.py` — fetches integrations, passes to container creation
  - [x] Token refresh logic (on-demand when tokens expire)
  - [x] Config updated + container restarted when user connects/disconnects services
- [x] **Catalyst UI Components** (frontend):
  - [x] Installed: @headlessui/react, motion, clsx, @heroicons/react
  - [x] Catalyst components in `frontend/src/components/`
  - [x] Link component updated for Next.js integration
  - [x] Inter font configured in layout + globals.css
- [x] **Dashboard redesign with sidebar layout**:
  - [x] SidebarLayout with navigation (Assistant, API Keys, Usage)
  - [x] Profile dropdown in sidebar footer (avatar, username, phone, sign out)
  - [x] Section-based content switching
  - [x] API Keys section with provider cards (Anthropic, OpenAI, Google)
  - [x] Connected Services UI (currently hidden - waiting for Google OAuth verification)
  - [x] Responsive mobile navigation (hamburger menu)
- [x] **Browser support (Sandbox Model)**:
  - [x] Lightweight gateway image `yourclaw-openclaw:latest` — no browser deps
  - [x] Separate browser sandbox image `openclaw-sandbox-browser:bookworm-slim` — Chromium + Playwright
  - [x] `infra/docker/Dockerfile` — lightweight gateway (node:22-bookworm-slim + git)
  - [x] `infra/docker/Dockerfile.sandbox-browser` — browser sandbox with Chromium
  - [x] `infra/docker/build.sh` — builds both images
  - [x] Docker socket mounted in gateway containers to spawn browser sandboxes on-demand
  - [x] Browser sandbox config: `agents.defaults.sandbox.browser.enabled: true`
  - [x] Auto-pruning: browser containers cleaned up after 1h idle
- [x] **Model selection**:
  - [x] `supabase/migrations/003_assistant_model.sql` — model column on assistants table
  - [x] `backend/app/schemas.py` — AVAILABLE_MODELS, AssistantUpdateInput
  - [x] `backend/app/routers/assistants.py` — PATCH endpoint for model updates
  - [x] `backend/app/worker.py` — fetches model from DB, passes to container
  - [x] `frontend/src/lib/api.ts` — model constants, updateAssistant API call
  - [x] `frontend/src/app/dashboard/page.tsx` — model selector cards UI
  - [x] Changing model triggers reprovisioning
- [x] **Full OpenClaw configuration**:
  - [x] `tools.profile: "full"` — all tools enabled
  - [x] `contextTokens: 200000` — max context for Claude
  - [x] `thinkingDefault: "low"` — extended thinking enabled
  - [x] `compaction.memoryFlush: enabled` — efficient memory management
  - [x] `web.search/fetch enabled` — web access
  - [x] `media.image enabled` — image analysis
- [x] **Stripe integration**:
  - [x] Stripe product + price created (YourClaw Pro, $20/month)
  - [x] Checkout endpoint creates Stripe session
  - [x] Webhook handles checkout.session.completed → creates subscription
  - [x] Webhook handles invoice.payment_succeeded → renews period
  - [x] Webhook handles invoice.payment_failed → marks PAST_DUE
  - [x] Webhook handles customer.subscription.deleted → cancels + stops container
  - [x] Frontend redirects to Stripe Checkout when user has no subscription
  - [x] Tested end-to-end with Stripe CLI
  - [x] Removed "$10 credits" from website (no credits system for MVP)
- [x] **Container cleanup fix**:
  - [x] DELETE /assistants now keeps container_id (was clearing it immediately)
  - [x] Worker cleanup_deleted_assistants() properly stops containers with status=NONE

### WhatsApp: Reply Mode (IMPORTANT)

**Current status:** Production number `+15557589499` active. Inbound works. **Outbound REST API blocked** (Meta Business Account not fully approved for sending). Using TwiML inline as workaround.

**Current mode: TwiML inline (temporary):**
- ALL replies use TwiML inline response (synchronous)
- Works for both sandbox and production numbers
- **15-second timeout**: if OpenClaw takes longer, reply is dropped
- Conversation history reduced to 10 messages to speed up responses
- Only fast models available (Sonnet 4.5, Haiku 4.5). Big models marked "Coming Soon"

**How it works in code (`webhooks.py`):**
```python
# Current: TwiML inline for all replies
async def reply_message(msg: str) -> Response:
    escaped = html.escape(msg)
    return Response(content=f"<Response><Message>{escaped}</Message></Response>", ...)
```

**When Meta fully approves outbound sending (REST API):**
1. In `webhooks.py`, restore the REST API mode in `reply_message()`:
   - Return empty TwiML immediately: `<Response></Response>`
   - Send actual reply asynchronously via `send_twilio_message()` (no timeout)
2. Remove `comingSoon: true` from big models in `frontend/src/lib/api.ts`
3. Increase conversation history back to 20 messages in `webhooks.py`
4. Template notifications (`send_ready_notification`) will also start working
5. Test end-to-end: send message → verify reply arrives via REST API

**Twilio error reference:**
- **63007**: "Could not find Channel with specified From address" → outbound not approved
- **63015**: Session window expired → need template message or user must message first
- **21656**: Invalid Content Variables → template not approved or wrong format

### WhatsApp 24-Hour Session Window (IMPORTANT)

WhatsApp Business API has a **24-hour session window** policy:
- You can only send free-form messages within 24 hours of the user's LAST message
- Outside this window, you can ONLY send pre-approved **template messages**
- This is a Meta/WhatsApp policy enforced by Twilio

**Impact on YourClaw:**
- We CANNOT proactively message users (e.g., "Your assistant is ready!")
- User MUST send the first message to initiate the session
- Once they message, we have 24 hours to respond freely

**Solution: Template Messages (IMPLEMENTED)**

We use pre-approved WhatsApp template messages to notify users when their assistant is ready.

**Template details:**
- **Content SID**: `HX2da33755ce26e6cd5177e9d07bba71d6`
- **Category**: UTILITY (transactional)
- **Env var**: `TWILIO_TEMPLATE_ASSISTANT_READY`

**Flow:**
1. User creates assistant → provisioning starts
2. Worker provisions container → health check passes
3. Worker calls `send_ready_notification()` → sends template via Twilio Content API
4. User receives "Your assistant is ready!" on WhatsApp
5. User replies → 24-hour session window opens → free-form conversation begins

**Code:**
```python
# backend/app/routers/webhooks.py
async def send_twilio_template(to_number: str, content_sid: str) -> None:
    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    message = client.messages.create(
        from_=settings.twilio_whatsapp_number,
        to=f"whatsapp:{to_number}",
        content_sid=content_sid,
    )

# backend/app/worker.py
async def send_ready_notification(user_id: str) -> None:
    await send_twilio_template(
        phone_row["phone_e164"],
        settings.twilio_template_assistant_ready,
    )
```

**To create additional templates:**
1. Twilio Console → Messaging → Content Template Builder
2. Create template with category "UTILITY"
3. Submit for Meta approval (24-48h, often faster)
4. Add Content SID to config and code

### Next Steps (in order)
1. **Increase Anthropic API rate limit** (ACTION REQUIRED):
   - Current limit: 50k input tokens/min on Haiku (Tier 1 — lowest)
   - Browser automation burns 20-30k tokens per turn (tool defs + snapshots + history)
   - With 100 users, 2-3 concurrent requests would exhaust the limit
   - Fix: Go to console.anthropic.com → Settings → Limits, or contact Anthropic sales
   - Adding a credit card / depositing funds usually auto-upgrades tier
   - Target: Tier 2+ (200k-2M+ tokens/min)
2. **Switch WhatsApp replies to REST API** (BLOCKED — waiting for Meta Business Account full approval):
   - Currently using TwiML inline responses (synchronous, ~15s timeout)
   - Once Meta approves outbound sending, switch to async REST API (no timeout)
   - Code change: in `webhooks.py`, uncomment REST API mode in `reply_message()`
   - Test: send a message and verify reply arrives via REST API (not TwiML)
   - Remove the TwiML fallback once confirmed working
   - Template messages (`send_ready_notification`) will also start working
   - Browser automation will work end-to-end (needs 30-60s for multi-step tasks)
3. **Enable big models** (BLOCKED — TwiML 15s timeout):
   - Opus 4.5, GPT-4o, Gemini 2.0 Flash marked "Coming Soon" in dashboard
   - These models are too slow for TwiML inline (>15s responses)
   - Once REST API is active (no timeout), remove `comingSoon` flag from models in `api.ts`
4. **Rate Limits** (TODO):
   - [ ] Implement daily message rate limits (e.g., 100 msg/day per user)
   - [ ] Implement per-minute rate limits (e.g., 5 msg/min)
5. **Post-launch: Google Integrations** (PAUSED - not production ready):
   - [x] Backend complete: OAuth flow, token storage, MCP config injection
   - [x] Frontend complete: Connected Services UI (currently hidden)
   - [ ] Test with real Google OAuth credentials
   - [ ] Get Google OAuth app verified for production
   - [ ] Re-enable in dashboard when ready

### Completed
- [x] **Browser tool fix — native browser disabled, Playwright MCP working** (2026-02-09):
  - **Problem**: OpenClaw has two browser systems: native (Chrome extension relay) and Playwright MCP. The native tool was in the LLM's tool list, so it tried to use it first — but it can't work in a headless Docker container (no Chrome extension). Even after disabling it with `browser.enabled: false`, the tool definition was still sent to the LLM.
  - **Fix 1**: `tools.deny: ["browser", "playwright_browser_install"]` — removes native browser tool AND the install tool from the LLM's tool list entirely. The LLM only sees `playwright_browser_*` tools.
  - **Fix 2**: `browser.enabled: false` — belt-and-suspenders, prevents the browser control service from starting.
  - **Fix 3**: `--executable-path /usr/bin/chromium` added to Playwright MCP args — the env vars (`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`) were ignored by the MCP server, it needs the CLI flag.
  - **Fix 4**: Updated CLAUDE.md system instructions in workspace to list all `playwright_browser_*` tools.
  - **Verified**: Tested directly on container — example.com and booking.com both return full page content via Playwright MCP.
  - **Remaining limitation**: Browser automation needs 30-60s for multi-step tasks, incompatible with TwiML 15s timeout. Works via direct API, will work on WhatsApp once REST API mode is enabled.
- [x] **TwiML fallback + production fixes** (2026-02-09):
  - Switched to TwiML inline responses (Meta outbound not approved yet)
  - Reduced conversation history from 20 to 10 messages (faster responses within 15s TwiML timeout)
  - Big models (Opus 4.5, GPT-4o, Gemini) marked "Coming Soon" (too slow for TwiML)
  - Only Sonnet 4.5 and Haiku 4.5 selectable for now
  - Template notification made best-effort (won't fail provisioning job)
  - SSH key parsing: auto-detect Ed25519/RSA/ECDSA (was hardcoded RSA)
  - Google OAuth `prompt: "select_account"` added to login (forces account picker)
  - Dashboard shows WhatsApp number + "Open WhatsApp" deep link when assistant is READY
- [x] **WhatsApp template message** (2026-02-09):
  - Template SID: `HX2da33755ce26e6cd5177e9d07bba71d6`
  - Sent when assistant provisioning completes (best-effort, won't block provisioning)
  - Bypasses 24-hour session window limitation
  - `send_twilio_template()` function in webhooks.py
  - Worker calls `send_ready_notification()` after health check passes
- [x] **Google Analytics** (2026-02-09):
  - GA4 tag (G-2E55TEMF7X) added to root layout
  - Tracks all pages: marketing, login, dashboard
  - Uses Next.js Script component with `afterInteractive` strategy
- [x] **BYOK (Bring Your Own Key)** (2026-02-09):
  - Dashboard → API Keys section with cards for each provider
  - Users can add/remove keys for Anthropic, OpenAI, Google
  - Adding/removing key triggers automatic reprovisioning
  - Worker fetches BYOK keys, uses them over shared keys
  - Keys encrypted with Fernet, never exposed in API responses
  - `backend/app/routers/api_keys.py` - GET/POST/DELETE endpoints
  - `frontend/src/app/dashboard/page.tsx` - API Keys UI section
- [x] **Multi-provider LLM support** (2026-02-09):
  - Added OpenAI and Google API keys to config
  - 7 models available: Claude (3), GPT (2), Gemini (2)
  - All keys passed to containers as env vars
  - Model selection triggers reprovisioning with correct provider key
- [x] **Waitlist mode** (2026-02-09, reverted same day):
  - Temporarily added waitlist while waiting for Meta approval
  - Resend integration for notification emails
  - Reverted to normal signup flow after approval
- [x] **Browser automation working** (2026-02-08):
  - Installed Playwright MCP server via `openclaw-mcp-adapter` plugin
  - 22 browser tools available: navigate, click, fill_form, screenshot, etc.
  - Tested: Successfully navigated to example.com and booking.com
  - Uses system Chromium in container (no separate sandbox needed)
  - See "Browser Automation via Playwright MCP" section for details
- [x] **OpenClaw tools working** (2026-02-08):
  - Fixed sandbox config issue - disabled native sandbox mode
  - Working: Web search, web fetch, bash/exec, file read/write, image analysis
  - Browser automation now via Playwright MCP (see above)
- [x] **MCP Servers / Integrations backend**: OAuth flow, token storage, container config injection
- [x] **Marketing site v2**:
  - YourClaw-focused copy (removed heavy OpenClaw branding)
  - Time comparison section (DIY 80 min vs YourClaw 2 min)
  - Removed Google integrations from marketing (not production ready)
  - Features: web browsing, file creation, code execution (what actually works)
  - SEO: OpenGraph, Twitter cards, meta tags
  - Hidden "Connected Services" from dashboard
- [x] **Browser sandbox model**: Lightweight gateway + separate browser container via Docker socket
- [x] **Stripe checkout + subscription flow** (tested with Stripe CLI)
- [x] **Production deployment** (2026-02-08):
  - Backend deployed on Render: `https://yourclaw.onrender.com`
  - Frontend deployed on Vercel: `https://www.yourclaw.dev`
  - CORS configured with automatic www/non-www variants and trailing slash handling
  - Environment variables: `APP_URL`, `MARKETING_URL` set in Render
- [x] **Marketing page polish** (2026-02-08):
  - Removed all "$10 in AI credits" references (pricing, hero, CTA, FAQ)
  - Phone placeholder now E.164 format: `+1 555 123 4567`
  - Competitor section: replaced "Non-technical? Multiply by 10×" with maintenance note
  - FAQ: "Powered by OpenClaw" (not Claude), removed credits question
  - Phone mockup improvements:
    - Header: "Y" logo, "YourClaw" name, compact design
    - Messages: varying timestamps (9:41 AM, 9:42 AM)
    - Proper WhatsApp blue double-check SVG icons
  - Model selector: official logos (Claude, OpenAI, Gemini) in `/public/`
  - Model buttons: added shadows for depth

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
