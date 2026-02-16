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


async def _get_provision_keys(user_id: str) -> dict[str, str]:
    """Build API key dict for infra API provision call.

    Uses shared AI Gateway key by default (routes to all providers).
    Individual provider keys are only sent if the user set BYOK keys.
    """
    from app.services.encryption import decrypt

    keys: dict[str, str] = {}

    # Shared AI Gateway key (routes to all providers via Vercel)
    if settings.ai_gateway_api_key:
        keys["ai_gateway_key"] = settings.ai_gateway_api_key

    # BYOK keys from dashboard (individual provider keys only if user set them)
    byok_rows = await db.select("api_keys", filters={"user_id": user_id})
    for row in byok_rows:
        provider = row["provider"]
        encrypted = row.get("encrypted_key")
        if not encrypted:
            continue
        decrypted = decrypt(encrypted)
        if provider == "ANTHROPIC":
            keys["anthropic_key"] = decrypted
        elif provider == "OPENAI":
            keys["openai_key"] = decrypted
        elif provider == "GOOGLE":
            keys["google_key"] = decrypted

    return keys


@router.get("", response_model=AssistantResponse)
async def get_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> AssistantResponse:
    """Get current user's assistant status."""

    row = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)

    if not row:
        return AssistantResponse(status="NONE")

    return AssistantResponse(
        status=row["status"],
        model=row.get("model", DEFAULT_MODEL),
        claw_id=row.get("claw_id"),
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

    # Check subscription is active (skip in mock mode)
    if not settings.mock_stripe:
        sub = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
        if not sub or sub["status"] != "ACTIVE":
            raise HTTPException(
                status_code=402,
                detail="Active subscription required. Please subscribe first.",
            )

    # Check if already provisioning
    assistant = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    if assistant and assistant["status"] == "PROVISIONING":
        return AssistantCreateResponse(
            status="PROVISIONING",
            model=assistant.get("model", DEFAULT_MODEL),
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

    # Store telegram bot token if provided
    if body.telegram_bot_token:
        await db.update(
            "user_phones",
            {"telegram_bot_token_encrypted": encrypt(body.telegram_bot_token)},
            {"user_id": str(user_id)},
        )

    # Build telegram_allow_from
    telegram_allow_from = body.telegram_allow_from
    if not telegram_allow_from:
        phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
        if phone_row and phone_row.get("telegram_username"):
            telegram_allow_from = [phone_row["telegram_username"]]

    # Get bot token (from input or stored)
    telegram_bot_token = body.telegram_bot_token or ""
    if not telegram_bot_token:
        phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
        if phone_row and phone_row.get("telegram_bot_token_encrypted"):
            from app.services.encryption import decrypt
            telegram_bot_token = decrypt(phone_row["telegram_bot_token_encrypted"])

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
            **provision_keys,
        )

        await db.update(
            "assistants",
            {"status": "READY", "claw_id": claw_id, "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )

        logger.info(f"Assistant provisioned for user {user_id}: claw_id={claw_id}")
        return AssistantCreateResponse(status="READY", model=model, claw_id=claw_id)

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

    # Get telegram info
    phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
    telegram_bot_token = ""
    telegram_allow_from: list[str] = []
    if phone_row:
        if phone_row.get("telegram_bot_token_encrypted"):
            from app.services.encryption import decrypt
            telegram_bot_token = decrypt(phone_row["telegram_bot_token_encrypted"])
        if phone_row.get("telegram_username"):
            telegram_allow_from = [phone_row["telegram_username"]]

    provision_keys = await _get_provision_keys(str(user_id))

    try:
        await infra_api.provision(
            user_id=_infra_user_id(user_id),
            claw_id=new_claw_id,
            model=body.model,
            telegram_bot_token=telegram_bot_token,
            telegram_allow_from=telegram_allow_from,
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
