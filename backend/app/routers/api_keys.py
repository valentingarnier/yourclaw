import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import db
from app.schemas import ApiKeyInput, ApiKeyResponse
from app.services.encryption import encrypt

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("", response_model=ApiKeyResponse, status_code=201)
async def add_api_key(
    body: ApiKeyInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> ApiKeyResponse:
    """Store user's own API key (BYOK).

    Encrypts the key before storage. Replaces existing key for same provider.
    """

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
    """Remove user's API key, revert to shared key."""

    result = await db.delete("api_keys", {"user_id": str(user_id), "provider": provider})
    if not result:
        raise HTTPException(status_code=404, detail="No API key found for this provider")
