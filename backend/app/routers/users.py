import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.database import db
from app.schemas import ChannelInput, PhoneInput, UserProfile
from app.services.email_service import add_resend_contact, send_welcome_email

logger = logging.getLogger("yourclaw.users")

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_me(user_id: uuid.UUID = Depends(get_current_user)) -> UserProfile:
    """Get current user profile with phone, subscription, and assistant status."""

    # Get user phone/channel
    phone_row = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
    phone = phone_row["phone_e164"] if phone_row else None
    channel = phone_row["channel"] if phone_row else None
    telegram_connected = bool(phone_row.get("telegram_username")) if phone_row else False

    # Get subscription status
    sub_row = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
    subscription_status = sub_row["status"] if sub_row else None

    # Get assistant status
    assistant_row = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    assistant_status = assistant_row["status"] if assistant_row else None

    # Get user email from Supabase auth
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
        )
        if resp.status_code != 200:
            if settings.dev_user_id:
                email = "dev@localhost"
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch user info")
        else:
            user_data = resp.json()
            email = user_data.get("email", "")

    return UserProfile(
        id=user_id,
        email=email,
        phone=phone,
        channel=channel,
        telegram_connected=telegram_connected,
        subscription_status=subscription_status,
        assistant_status=assistant_status,
    )


@router.post("/me/phone", response_model=UserProfile)
async def set_phone(
    body: PhoneInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> UserProfile:
    """Set or update user's WhatsApp phone number (E.164 format)."""

    # Upsert phone record (backward compat — always sets channel to WHATSAPP)
    await db.upsert(
        "user_phones",
        {"user_id": str(user_id), "phone_e164": body.phone, "channel": "WHATSAPP"},
        on_conflict="user_id",
    )

    # Return updated profile
    return await get_me(user_id)


@router.post("/me/channel", response_model=UserProfile)
async def set_channel(
    body: ChannelInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> UserProfile:
    """Set or update user's messaging channel (WhatsApp or Telegram)."""

    # Check if this is first-time setup (no existing record = new sign-up)
    existing = await db.select("user_phones", filters={"user_id": str(user_id)}, single=True)
    is_new_user = existing is None

    data: dict = {
        "user_id": str(user_id),
        "channel": body.channel,
        "telegram_username": body.telegram_username.lstrip("@").strip() if body.channel == "TELEGRAM" and body.telegram_username else None,
    }
    # Only set phone if explicitly provided (WhatsApp no longer requires upfront phone)
    if body.phone:
        data["phone_e164"] = body.phone
    elif body.channel == "TELEGRAM":
        data["phone_e164"] = None

    await db.upsert("user_phones", data, on_conflict="user_id")

    # Send welcome email + add Resend contact on first sign-up (best-effort)
    if is_new_user:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
                    headers={
                        "apikey": settings.supabase_service_role_key,
                        "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    },
                )
                if resp.status_code == 200:
                    user_data = resp.json()
                    email = user_data.get("email", "")
                    meta = user_data.get("user_metadata", {})
                    full_name = meta.get("name", "")
                    first_name = full_name.split(" ")[0] if full_name else ""
                    name_parts = full_name.split(" ", 1) if full_name else []
                    last_name = name_parts[1] if len(name_parts) > 1 else ""

                    if email:
                        await send_welcome_email(email, first_name, body.channel)
                        await add_resend_contact(email, first_name, last_name)
        except Exception as e:
            logger.error(f"Failed to send welcome email for user {user_id}: {e}")

    return await get_me(user_id)
