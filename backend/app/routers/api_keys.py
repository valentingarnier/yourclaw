import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import db
from app.schemas import ApiKeyInput, ApiKeyResponse
from app.services.encryption import encrypt

router = APIRouter(prefix="/api-keys", tags=["api-keys"])
logger = logging.getLogger("yourclaw.api_keys")

# Valid providers
VALID_PROVIDERS = ["ANTHROPIC", "OPENAI", "GOOGLE"]


async def trigger_reprovisioning(user_id: str) -> bool:
    """Trigger reprovisioning if user has an active assistant.

    Returns True if reprovisioning was triggered.
    """
    # Check if user has an assistant
    assistant = await db.select("assistants", filters={"user_id": user_id}, single=True)
    if not assistant or assistant.get("status") not in ["READY", "ERROR"]:
        return False

    # Update assistant status to trigger reprovisioning
    await db.update("assistants", {"status": "PROVISIONING"}, {"user_id": user_id})

    # Create provisioning job
    await db.insert("provisioning_jobs", {
        "user_id": user_id,
        "status": "PENDING",
    })

    logger.info(f"Triggered reprovisioning for user {user_id} due to API key change")
    return True


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user_id: uuid.UUID = Depends(get_current_user),
) -> list[ApiKeyResponse]:
    """List user's API keys (without exposing actual values)."""

    keys = await db.select("api_keys", filters={"user_id": str(user_id)})

    return [
        ApiKeyResponse(
            provider=key["provider"],
            created_at=key["created_at"],
            has_key=True,
        )
        for key in keys
    ]


@router.post("", response_model=ApiKeyResponse, status_code=201)
async def add_api_key(
    body: ApiKeyInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> ApiKeyResponse:
    """Store user's own API key (BYOK).

    Encrypts the key before storage. Replaces existing key for same provider.
    Triggers reprovisioning if assistant exists.
    """
    # Validate provider
    if body.provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Valid providers: {', '.join(VALID_PROVIDERS)}"
        )

    encrypted = encrypt(body.key)

    # Upsert: replace if exists
    await db.upsert(
        "api_keys",
        {
            "user_id": str(user_id),
            "provider": body.provider,
            "encrypted_key": encrypted,
        },
        on_conflict="user_id,provider",
    )

    # Trigger reprovisioning to apply new key
    await trigger_reprovisioning(str(user_id))

    return ApiKeyResponse(
        provider=body.provider,
        created_at=datetime.utcnow(),
        has_key=True,
    )


@router.delete("", status_code=204)
async def delete_api_key(
    provider: str = "ANTHROPIC",
    user_id: uuid.UUID = Depends(get_current_user),
) -> None:
    """Remove user's API key, revert to shared key.

    Triggers reprovisioning if assistant exists.
    """
    # Validate provider
    if provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Valid providers: {', '.join(VALID_PROVIDERS)}"
        )

    result = await db.delete("api_keys", {"user_id": str(user_id), "provider": provider})
    if not result:
        raise HTTPException(status_code=404, detail="No API key found for this provider")

    # Trigger reprovisioning to revert to shared key
    await trigger_reprovisioning(str(user_id))
