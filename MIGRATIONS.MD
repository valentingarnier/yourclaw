Plan: Call Infra API from Backend + Update Frontend
Context
A separate infra API service is already deployed at 91.98.219.39 (Host: api.yourclaw.dev) with /provision and /deprovision endpoints. Our FastAPI backend needs to call those endpoints via HTTP instead of using the old SSH+worker approach. Per-user Telegram bots: users provide their own @BotFather token, OpenClaw handles Telegram natively.

Flow: Frontend → FastAPI backend → HTTP call to infra API → done

1. Backend: New settings in config.py
File: backend/app/config.py

Add:


# Infra API (separate service at 91.98.219.39)
infra_api_url: str = "http://91.98.219.39"
infra_api_host: str = "api.yourclaw.dev"  # Host header
yourclaw_api_key: str = ""                # Bearer token for infra API

# AI Gateway
ai_gateway_api_key: str = ""  # Shared Vercel AI Gateway key
2. Backend: Infra API HTTP client
New file: backend/app/services/infra_api.py

Simple async HTTP client that calls the deployed infra API:


async def provision(
    user_id: str, claw_id: str, model: str,
    ai_gateway_key: str = "",
    telegram_bot_token: str = "", telegram_allow_from: list[str] = [],
) -> dict:
    """POST /provision on infra API."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{settings.infra_api_url}/provision",
            headers={
                "Host": settings.infra_api_host,
                "Authorization": f"Bearer {settings.yourclaw_api_key}",
            },
            json={
                "user_id": user_id,
                "claw_id": claw_id,
                "ai_gateway_key": ai_gateway_key or settings.ai_gateway_api_key,
                "model": model,
                "telegram_bot_token": telegram_bot_token,
                "telegram_allow_from": telegram_allow_from,
            },
        )
        resp.raise_for_status()
        return resp.json()

async def deprovision(user_id: str, claw_id: str) -> dict:
    """POST /deprovision on infra API."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{settings.infra_api_url}/deprovision",
            headers={
                "Host": settings.infra_api_host,
                "Authorization": f"Bearer {settings.yourclaw_api_key}",
            },
            json={"user_id": user_id, "claw_id": claw_id},
        )
        resp.raise_for_status()
        return resp.json()
3. Backend: Update assistants router
File: backend/app/routers/assistants.py

POST /assistants (create)
Replace provisioning_job creation with direct infra API call:

Validate subscription (existing logic)
Get user's bot token from DB + BYOK keys
Generate claw_id (e.g. "claw-1")
Set assistant status=PROVISIONING in DB
Call infra_api.provision(user_id, claw_id, model, ...)
On success: set status=READY, store claw_id in DB
On failure: set status=ERROR
DELETE /assistants
Replace worker-based cleanup with direct infra API call:

Get assistant's claw_id from DB
Call infra_api.deprovision(user_id, claw_id)
Set status=NONE, clear fields
PATCH /assistants (model change)
Same pattern — deprovision old, provision new with updated model.

4. Backend: Update schemas
File: backend/app/schemas.py

Update AssistantCreateInput:


class AssistantCreateInput(BaseModel):
    model: str = DEFAULT_MODEL
    telegram_bot_token: str | None = None
    telegram_allow_from: list[str] = Field(default_factory=list)
Update AssistantResponse — add claw_id:


claw_id: str | None = None
5. Database: Migration
New file: supabase/migrations/005_infra_rework.sql


ALTER TABLE assistants ADD COLUMN IF NOT EXISTS claw_id VARCHAR(100);

ALTER TABLE user_phones ADD COLUMN IF NOT EXISTS telegram_bot_token_encrypted TEXT;
6. Frontend: Dashboard updates
File: frontend/src/app/dashboard/page.tsx

Add Telegram bot token input (with @BotFather instructions)
Add "Allowed usernames" input (the user's Telegram username, used for telegram_allow_from)
Pass both to api.createAssistant()
Default channel to TELEGRAM
When READY: show "Message your bot on Telegram"
File: frontend/src/lib/api.ts

Update createAssistant:


createAssistant: (data: {
  model?: string;
  telegram_bot_token?: string;
  telegram_allow_from?: string[];
}) => apiPost("/api/v1/assistants", data)
Add claw_id to AssistantResponse.

7. Cleanup
backend/app/worker.py — delete (no longer needed)
backend/app/services/container_service.py — keep for now (webhooks still use call_openclaw for WhatsApp message routing, which is independent of provisioning)
File Changes Summary
File	Action
backend/app/config.py	Edit — add infra_api_url, infra_api_host, yourclaw_api_key, ai_gateway_api_key
backend/app/services/infra_api.py	Create — HTTP client for infra API (provision/deprovision)
backend/app/routers/assistants.py	Edit — call infra_api instead of creating provisioning_jobs
backend/app/schemas.py	Edit — add telegram fields to AssistantCreateInput, claw_id to response
backend/app/main.py	No change (assistants router already registered)
supabase/migrations/005_infra_rework.sql	Create — add claw_id, bot token columns
frontend/src/app/dashboard/page.tsx	Edit — bot token input, username input
frontend/src/lib/api.ts	Edit — update createAssistant params + response type
backend/app/worker.py	Delete
Verification
MOCK_CONTAINERS=false — backend calls real infra API
Dashboard: enter bot token + model → create → status READY
Delete assistant → infra API deprovision called → status NONE
WhatsApp webhook still works for existing users
User approved the plan
Update Todos

Add infra API settings to config.py

Create infra_api.py HTTP client (provision/deprovision)

Update schemas.py (telegram fields, claw_id)

Rewrite assistants router to call infra API

Create DB migration 005_infra_rework.sql

Update frontend api.ts types and createAssistant

Update dashboard with bot token + username inputs

Delete worker.py
Edit config.py
Edit failed
Read config.py
Edit config.py
Added 8 lines
also make sure of two thngs: frontend shows how to connect botfather on telegram witha nice tutorial.

and you reset the offer of 48h on the frontend website.