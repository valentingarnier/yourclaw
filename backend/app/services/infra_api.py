"""HTTPS client for the YourClaw infra API.

The infra API is a separate service that handles container provisioning
and deprovisioning on the k8s cluster. This module calls its endpoints.

Base URL: https://infra.api.yourclaw.dev
"""

import hashlib
import json
import logging
import uuid as _uuid

import httpx

from app.config import settings

logger = logging.getLogger("yourclaw.infra_api")


def infra_user_id(user_id: str | _uuid.UUID) -> str:
    """Convert Supabase UUID to stable short numeric ID for infra API.

    Uses SHA-256 hash truncated to 8 digits for collision resistance
    while keeping IDs numeric-only (k8s label friendly).
    Same UUID always produces the same ID.
    """
    h = hashlib.sha256(str(user_id).encode()).hexdigest()
    return f"user-{int(h[:10], 16) % 10**8}"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.yourclaw_api_key}",
        "Content-Type": "application/json",
    }


async def provision(
    user_id: str,
    claw_id: str,
    model: str,
    anthropic_key: str = "",
    openai_key: str = "",
    google_key: str = "",
    system_instructions: str | None = None,
    telegram_bot_token: str = "",
    telegram_allow_from: list[str] | None = None,
) -> dict:
    """Provision an OpenClaw instance via the infra API.

    Args:
        user_id: User identifier.
        claw_id: Claw instance identifier.
        model: LLM model string.
        anthropic_key: Anthropic API key (BYOK).
        openai_key: OpenAI API key (BYOK).
        google_key: Google API key (BYOK).
        system_instructions: Custom system prompt (stored as SOUL.md).
        telegram_bot_token: Per-user Telegram bot token from @BotFather.

    Returns:
        Response dict from infra API.
    """
    if settings.mock_containers:
        logger.info(f"[Mock] Provision {user_id}/{claw_id} model={model}")
        return {"status": "ok", "user_id": user_id, "claw_id": claw_id}

    payload: dict = {
        "user_id": user_id,
        "claw_id": claw_id,
        "model": model,
    }

    if anthropic_key:
        payload["anthropic_key"] = anthropic_key
    if openai_key:
        payload["openai_key"] = openai_key
    if google_key:
        payload["google_key"] = google_key
    if system_instructions is not None:
        payload["system_instructions"] = system_instructions
    if telegram_bot_token:
        payload["telegram_bot_token"] = telegram_bot_token
    if telegram_allow_from:
        payload["telegram_allow_from"] = telegram_allow_from

    # Build a redacted copy for debug logging (never log secrets)
    debug_payload = {
        k: (
            f"{v[:4]}...{v[-4:]}" if k in ("anthropic_key", "openai_key", "google_key", "telegram_bot_token") and isinstance(v, str) and len(v) > 8
            else v
        )
        for k, v in payload.items()
    }

    url = f"{settings.infra_api_url}/provision"
    logger.info(f"Provision POST {url}\n{json.dumps(debug_payload, indent=2)}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            url,
            headers=_headers(),
            json=payload,
        )
        logger.info(f"Provision response status={resp.status_code} body={resp.text}")
        resp.raise_for_status()
        data = resp.json()

    logger.info(f"Provisioned {user_id}/{claw_id}: {data}")
    return data


async def get_status(user_id: str, claw_id: str) -> dict:
    """Get real-time pod status for a claw instance from the infra API."""
    if settings.mock_containers:
        logger.info(f"[Mock] Status {user_id}/{claw_id}")
        return {"user_id": user_id, "claw_id": claw_id, "ready": True, "pod_phase": "Running"}

    url = f"{settings.infra_api_url}/claws/{user_id}/{claw_id}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def deprovision(user_id: str, claw_id: str) -> dict:
    """Deprovision a single claw instance via the infra API."""
    if settings.mock_containers:
        logger.info(f"[Mock] Deprovision {user_id}/{claw_id}")
        return {"status": "ok"}

    url = f"{settings.infra_api_url}/deprovision"
    deprovision_payload = {"user_id": user_id, "claw_id": claw_id}
    logger.info(f"Deprovisioning {user_id}/{claw_id}")
    logger.debug(f"Deprovision POST {url} payload={deprovision_payload}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            headers=_headers(),
            json=deprovision_payload,
        )
        logger.debug(f"Deprovision response status={resp.status_code} body={resp.text}")
        resp.raise_for_status()
        data = resp.json()

    logger.info(f"Deprovisioned {user_id}/{claw_id}: {data}")
    return data


async def deprovision_user(user_id: str) -> dict:
    """Deprovision ALL claw instances for a user via the infra API."""
    if settings.mock_containers:
        logger.info(f"[Mock] Deprovision all for user {user_id}")
        return {"status": "ok"}

    url = f"{settings.infra_api_url}/deprovision-user"
    deprovision_payload = {"user_id": user_id}
    logger.info(f"Deprovisioning all claws for user {user_id}")
    logger.debug(f"Deprovision-user POST {url} payload={deprovision_payload}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            headers=_headers(),
            json=deprovision_payload,
        )
        logger.debug(f"Deprovision-user response status={resp.status_code} body={resp.text}")
        resp.raise_for_status()
        data = resp.json()

    logger.info(f"Deprovisioned all for user {user_id}: {data}")
    return data
