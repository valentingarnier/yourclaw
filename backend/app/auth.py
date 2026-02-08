import uuid

import httpx
from fastapi import HTTPException, Request

from app.config import settings


async def get_current_user(request: Request) -> uuid.UUID:
    """Validate Supabase JWT and return user_id.

    Calls Supabase's /auth/v1/user endpoint with the bearer token
    to validate the session and extract the user ID.

    In dev mode, set DEV_USER_ID in .env to bypass auth.
    """
    # Dev bypass
    if settings.dev_user_id:
        return uuid.UUID(settings.dev_user_id)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = auth_header.split(" ", 1)[1]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = resp.json()
    return uuid.UUID(user_data["id"])


async def get_current_user_id(request: Request) -> str:
    """Get current user ID as string.

    Convenience wrapper around get_current_user for endpoints
    that work with string IDs.
    """
    user_uuid = await get_current_user(request)
    return str(user_uuid)
