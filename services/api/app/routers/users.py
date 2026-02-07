import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import db
from app.schemas import PhoneInput, UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_me(user_id: uuid.UUID = Depends(get_current_user)) -> UserProfile:
    """Get current user profile with phone, subscription, and assistant status."""

    # Get user phone
    phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
    phone = phone_row["phone_e164"] if phone_row else None

    # Get subscription status
    sub_row = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
    subscription_status = sub_row["status"] if sub_row else None

    # Get assistant status
    assistant_row = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    assistant_status = assistant_row["status"] if assistant_row else None

    # Get user email from Supabase auth
    import httpx
    from app.config import settings

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch user info")
        user_data = resp.json()
        email = user_data.get("email", "")

    return UserProfile(
        id=user_id,
        email=email,
        phone=phone,
        subscription_status=subscription_status,
        assistant_status=assistant_status,
    )


@router.post("/me/phone", response_model=UserProfile)
async def set_phone(
    body: PhoneInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> UserProfile:
    """Set or update user's WhatsApp phone number (E.164 format)."""

    # Upsert phone record
    await db.upsert(
        "user_phones",
        {"user_id": str(user_id), "phone_e164": body.phone},
        on_conflict="user_id",
    )

    # Return updated profile
    return await get_me(user_id)
