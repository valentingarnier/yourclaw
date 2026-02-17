import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.database import db
from app.schemas import (
    AssistantCreateInput,
    AssistantCreateResponse,
    AssistantResponse,
    AssistantUpdateInput,
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
)
from app.services import infra_api
from app.services.infra_api import infra_user_id as _infra_user_id
from app.services.encryption import encrypt

logger = logging.getLogger("yourclaw.assistants")

router = APIRouter(prefix="/assistants", tags=["assistants"])

_PROVIDER_KEY_MAP = {
    "ANTHROPIC": "anthropic_key",
    "OPENAI": "openai_key",
    "GOOGLE": "google_key",
    "VERCEL": "ai_gateway_key",
}

# Map model prefixes to the BYOK provider name stored in the api_keys table
_MODEL_PREFIX_TO_PROVIDER = {
    "anthropic": "ANTHROPIC",
    "openai": "OPENAI",
    "deepseek": "VERCEL",
    "minimax": "VERCEL",
    "moonshotai": "VERCEL",
}


def _get_provider_for_model(model: str) -> str:
    """Extract provider from model ID (e.g., 'anthropic/claude-sonnet-4-5' -> 'ANTHROPIC')."""
    prefix = model.split("/")[0]
    return _MODEL_PREFIX_TO_PROVIDER.get(prefix, prefix.upper())


async def _validate_provider_key(user_id: str, model: str) -> None:
    """Raise 400 if user has no BYOK API key for the selected model's provider."""
    provider = _get_provider_for_model(model)
    row = await db.select("api_keys", filters={"user_id": user_id, "provider": provider}, single=True)
    if not row or not row.get("encrypted_key"):
        raise HTTPException(
            status_code=400,
            detail=f"API key required for {provider}. Add your {provider} key in the API Keys section first.",
        )


async def _get_provision_keys(user_id: str) -> dict[str, str]:
    """Build API key dict for infra API provision call.

    Uses the user's BYOK keys configured in the dashboard.
    When VERCEL key is present, only the ai_gateway_key is sent
    (Vercel AI Gateway routes to all providers).
    """
    from app.services.encryption import decrypt

    keys: dict[str, str] = {}

    # BYOK keys from dashboard (individual provider keys)
    byok_rows = await db.select("api_keys", filters={"user_id": user_id})
    has_vercel = any(row["provider"] == "VERCEL" for row in byok_rows)

    for row in byok_rows:
        provider = row["provider"]
        encrypted = row.get("encrypted_key")
        if not encrypted:
            continue

        # When Vercel key is present, only pass ai_gateway_key
        if has_vercel and provider != "VERCEL":
            continue

        decrypted = decrypt(encrypted)
        key_name = _PROVIDER_KEY_MAP.get(provider)
        if key_name:
            keys[key_name] = decrypted

    return keys


@router.get("", response_model=AssistantResponse)
async def get_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> AssistantResponse:
    """Get current user's assistant status.

    When DB says READY or PROVISIONING, checks real pod status from infra API.
    Updates DB if pod is not actually ready.
    """

    row = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)

    if not row:
        return AssistantResponse(status="NONE")

    db_status = row["status"]
    claw_id = row.get("claw_id")

    # Check real pod status for READY/PROVISIONING states
    if db_status in ("READY", "PROVISIONING") and claw_id:
        try:
            pod_status = await infra_api.get_status(_infra_user_id(user_id), claw_id)
            pod_ready = pod_status.get("ready", False)

            if db_status == "READY" and not pod_ready:
                db_status = "PROVISIONING"
            elif db_status == "PROVISIONING" and pod_ready:
                db_status = "READY"
                await db.update(
                    "assistants",
                    {"status": "READY", "updated_at": datetime.utcnow().isoformat()},
                    {"user_id": str(user_id)},
                )
        except Exception as e:
            logger.warning(f"Failed to check pod status for {claw_id}: {e}")

    # Get channel from user_phones
    phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
    channel = phone_row["channel"] if phone_row else None

    return AssistantResponse(
        status=db_status,
        model=row.get("model", DEFAULT_MODEL),
        channel=channel,
        claw_id=claw_id,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.post("", response_model=AssistantCreateResponse, status_code=200)
async def create_assistant(
    body: AssistantCreateInput = AssistantCreateInput(),
    user_id: uuid.UUID = Depends(get_current_user),
) -> AssistantCreateResponse:
    """Create or recreate user's assistant.

    Calls the infra API to provision an OpenClaw instance directly.
    """

    # Validate model
    model = body.model
    if model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Available: {', '.join(AVAILABLE_MODELS)}",
        )

    # Validate user has a BYOK key for the model's provider
    await _validate_provider_key(str(user_id), model)

    # Check subscription is active (skip in mock mode)
    if not settings.mock_stripe:
        sub = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
        if not sub or sub["status"] != "ACTIVE":
            raise HTTPException(
                status_code=402,
                detail="Active subscription required. Please subscribe first.",
            )

    channel = body.channel

    # Validate channel-specific fields
    if channel == "TELEGRAM":
        if not body.telegram_bot_token or ":" not in body.telegram_bot_token:
            raise HTTPException(status_code=400, detail="Valid Telegram bot token required")
        if not body.telegram_username:
            raise HTTPException(status_code=400, detail="Telegram username required")

    # Check if already provisioning
    assistant = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    if assistant and assistant["status"] == "PROVISIONING":
        phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
        return AssistantCreateResponse(
            status="PROVISIONING",
            model=assistant.get("model", DEFAULT_MODEL),
            channel=phone_row["channel"] if phone_row else None,
            claw_id=assistant.get("claw_id"),
        )

    # Generate claw_id
    claw_id = f"claw-{uuid.uuid4().int % 10**7}"

    # Set status to PROVISIONING
    now = datetime.utcnow().isoformat()
    if assistant:
        # Deprovision existing instance first
        old_claw_id = assistant.get("claw_id")
        if old_claw_id:
            try:
                await infra_api.deprovision(_infra_user_id(user_id), old_claw_id)
            except Exception as e:
                logger.warning(f"Failed to deprovision old claw {old_claw_id}: {e}")

        await db.update(
            "assistants",
            {"status": "PROVISIONING", "model": model, "claw_id": claw_id, "updated_at": now},
            {"user_id": str(user_id)},
        )
    else:
        await db.insert(
            "assistants",
            {"user_id": str(user_id), "status": "PROVISIONING", "model": model, "claw_id": claw_id},
        )

    # Build channel-specific params
    telegram_bot_token = ""
    telegram_allow_from = None
    whatsapp_allow_from = None

    if channel == "WHATSAPP":
        phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
        phone_e164 = phone_row.get("phone_e164") if phone_row else None
        if phone_e164:
            whatsapp_allow_from = [phone_e164]

    elif channel == "TELEGRAM":
        # Store telegram bot token + username if provided
        phone_update: dict = {}
        if body.telegram_bot_token:
            phone_update["telegram_bot_token_encrypted"] = encrypt(body.telegram_bot_token)
        if body.telegram_username:
            phone_update["telegram_username"] = body.telegram_username.lstrip("@").strip()
        if phone_update:
            await db.update("user_phones", phone_update, {"user_id": str(user_id)})

        # Get bot token + username (from input or stored)
        phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
        telegram_bot_token = body.telegram_bot_token or ""
        if not telegram_bot_token and phone_row and phone_row.get("telegram_bot_token_encrypted"):
            from app.services.encryption import decrypt
            telegram_bot_token = decrypt(phone_row["telegram_bot_token_encrypted"])

        telegram_username = body.telegram_username or (phone_row.get("telegram_username") if phone_row else None)
        telegram_allow_from = [telegram_username] if telegram_username else None

    # Build API keys (shared + BYOK overrides)
    provision_keys = await _get_provision_keys(str(user_id))

    # Call infra API to provision
    try:
        await infra_api.provision(
            user_id=_infra_user_id(user_id),
            claw_id=claw_id,
            model=model,
            telegram_bot_token=telegram_bot_token,
            telegram_allow_from=telegram_allow_from,
            whatsapp_allow_from=whatsapp_allow_from,
            **provision_keys,
        )

        await db.update(
            "assistants",
            {"status": "READY", "claw_id": claw_id, "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )

        logger.info(f"Assistant provisioned for user {user_id}: claw_id={claw_id}, channel={channel}")
        return AssistantCreateResponse(status="READY", model=model, channel=channel, claw_id=claw_id)

    except Exception as e:
        logger.error(f"Provisioning failed for user {user_id}: {e}")
        await db.update(
            "assistants",
            {"status": "ERROR", "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )
        raise HTTPException(status_code=500, detail=f"Provisioning failed: {e}")


@router.patch("", response_model=AssistantResponse)
async def update_assistant(
    body: AssistantUpdateInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> AssistantResponse:
    """Update assistant settings (e.g., model).

    Deprovisions old instance, provisions new one with updated settings.
    """

    if body.model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Available: {', '.join(AVAILABLE_MODELS)}",
        )

    # Validate user has a BYOK key for the model's provider
    await _validate_provider_key(str(user_id), body.model)

    assistant = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    if not assistant:
        raise HTTPException(status_code=404, detail="No assistant found")

    if assistant["status"] == "PROVISIONING":
        raise HTTPException(status_code=409, detail="Assistant is currently provisioning")

    old_claw_id = assistant.get("claw_id")
    new_claw_id = f"claw-{uuid.uuid4().int % 10**7}"

    await db.update(
        "assistants",
        {"status": "PROVISIONING", "model": body.model, "claw_id": new_claw_id, "updated_at": datetime.utcnow().isoformat()},
        {"user_id": str(user_id)},
    )

    # Deprovision old
    if old_claw_id:
        try:
            await infra_api.deprovision(_infra_user_id(user_id), old_claw_id)
        except Exception as e:
            logger.warning(f"Failed to deprovision old claw {old_claw_id}: {e}")

    # Get channel-specific params
    phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
    channel = phone_row["channel"] if phone_row else "TELEGRAM"

    telegram_bot_token = ""
    telegram_allow_from = None
    whatsapp_allow_from = None

    if channel == "WHATSAPP":
        phone_e164 = phone_row.get("phone_e164") if phone_row else None
        if phone_e164:
            whatsapp_allow_from = [phone_e164]
    elif channel == "TELEGRAM":
        if phone_row and phone_row.get("telegram_bot_token_encrypted"):
            from app.services.encryption import decrypt
            telegram_bot_token = decrypt(phone_row["telegram_bot_token_encrypted"])

        telegram_username = phone_row.get("telegram_username") if phone_row else None
        telegram_allow_from = [telegram_username] if telegram_username else None

    provision_keys = await _get_provision_keys(str(user_id))

    try:
        await infra_api.provision(
            user_id=_infra_user_id(user_id),
            claw_id=new_claw_id,
            model=body.model,
            telegram_bot_token=telegram_bot_token,
            telegram_allow_from=telegram_allow_from,
            whatsapp_allow_from=whatsapp_allow_from,
            **provision_keys,
        )

        await db.update(
            "assistants",
            {"status": "READY", "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )

        return AssistantResponse(
            status="READY",
            model=body.model,
            claw_id=new_claw_id,
            created_at=assistant["created_at"],
            updated_at=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        logger.error(f"Reprovisioning failed for user {user_id}: {e}")
        await db.update(
            "assistants",
            {"status": "ERROR", "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )
        raise HTTPException(status_code=500, detail=f"Reprovisioning failed: {e}")


@router.delete("", status_code=204)
async def delete_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> None:
    """Delete user's assistant by calling infra API to deprovision."""

    assistant = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    if not assistant:
        return

    claw_id = assistant.get("claw_id")
    if claw_id:
        try:
            await infra_api.deprovision(_infra_user_id(user_id), claw_id)
        except Exception as e:
            logger.warning(f"Failed to deprovision claw {claw_id}: {e}")

    await db.update(
        "assistants",
        {
            "status": "NONE",
            "claw_id": None,
            "updated_at": datetime.utcnow().isoformat(),
        },
        {"user_id": str(user_id)},
    )
