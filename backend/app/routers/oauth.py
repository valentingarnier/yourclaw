"""Google OAuth endpoints for connecting Calendar, Gmail, Drive."""

import logging
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.auth import get_current_user_id
from app.config import settings
from app.database import db
from app.services.encryption import encrypt, decrypt

logger = logging.getLogger("yourclaw.oauth")

router = APIRouter(prefix="/oauth", tags=["oauth"])

# Google OAuth endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Scopes for each service
GOOGLE_SCOPES = {
    "calendar": [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
    ],
    "gmail": [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
    ],
    "drive": [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.file",
    ],
}

# Service name mapping
SERVICE_DB_NAMES = {
    "calendar": "GOOGLE_CALENDAR",
    "gmail": "GOOGLE_GMAIL",
    "drive": "GOOGLE_DRIVE",
}

# In-memory state storage (TODO: use Redis in production)
# Maps state -> {user_id, service, created_at}
oauth_states: dict[str, dict] = {}


def get_redirect_uri(service: str) -> str:
    """Get OAuth callback URL for a service."""
    return f"{settings.api_url}/api/v1/oauth/google/{service}/callback"


@router.get("/google/{service}/connect")
async def google_connect(
    service: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Start Google OAuth flow for a service.

    Returns URL to redirect user to Google consent screen.
    """
    if service not in GOOGLE_SCOPES:
        raise HTTPException(status_code=400, detail=f"Unknown service: {service}")

    # Generate state token
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": user_id,
        "service": service,
        "created_at": datetime.utcnow(),
    }

    # Clean up old states (older than 10 min)
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    for old_state in list(oauth_states.keys()):
        if oauth_states[old_state]["created_at"] < cutoff:
            del oauth_states[old_state]

    # Build authorization URL
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": get_redirect_uri(service),
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES[service] + ["email", "profile"]),
        "access_type": "offline",  # Get refresh token
        "prompt": "consent",  # Always show consent to get refresh token
        "state": state,
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    logger.info(f"Starting OAuth flow for user {user_id}, service {service}")
    return {"auth_url": auth_url}


@router.get("/google/{service}/callback")
async def google_callback(
    service: str,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    """Handle Google OAuth callback.

    Exchanges code for tokens, stores encrypted tokens in DB.
    Redirects back to dashboard.
    """
    # Validate state
    if state not in oauth_states:
        logger.warning(f"Invalid OAuth state: {state}")
        return RedirectResponse(f"{settings.app_url}/dashboard?error=invalid_state")

    state_data = oauth_states.pop(state)
    user_id = state_data["user_id"]

    if service not in GOOGLE_SCOPES:
        return RedirectResponse(f"{settings.app_url}/dashboard?error=unknown_service")

    # Exchange code for tokens
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": get_redirect_uri(service),
                },
            )
            resp.raise_for_status()
            tokens = resp.json()
    except Exception as e:
        logger.error(f"Token exchange failed: {e}")
        return RedirectResponse(f"{settings.app_url}/dashboard?error=token_exchange_failed")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)

    if not access_token or not refresh_token:
        logger.error(f"Missing tokens in response: {tokens}")
        return RedirectResponse(f"{settings.app_url}/dashboard?error=missing_tokens")

    # Get user's email from Google
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            userinfo = resp.json()
            email = userinfo.get("email")
    except Exception as e:
        logger.warning(f"Failed to get userinfo: {e}")
        email = None

    # Calculate expiry
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    # Store in DB (upsert)
    service_name = SERVICE_DB_NAMES[service]
    await db.upsert(
        "user_integrations",
        {
            "user_id": user_id,
            "service": service_name,
            "access_token_encrypted": encrypt(access_token),
            "refresh_token_encrypted": encrypt(refresh_token),
            "token_expires_at": expires_at.isoformat(),
            "scopes": GOOGLE_SCOPES[service],
            "email": email,
            "updated_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,service",
    )

    logger.info(f"Stored {service} integration for user {user_id} ({email})")

    # Trigger container update if assistant is running
    await update_container_config(user_id)

    return RedirectResponse(f"{settings.app_url}/dashboard?connected={service}")


@router.get("/integrations")
async def list_integrations(
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """List user's connected integrations."""
    integrations = await db.select(
        "user_integrations",
        columns="service,email,created_at,updated_at",
        filters={"user_id": user_id},
    )

    # Build response with connection status for each service
    connected = {row["service"]: {"email": row["email"], "connected_at": row["created_at"]}
                 for row in (integrations or [])}

    return {
        "google_calendar": connected.get("GOOGLE_CALENDAR"),
        "google_gmail": connected.get("GOOGLE_GMAIL"),
        "google_drive": connected.get("GOOGLE_DRIVE"),
    }


@router.delete("/google/{service}")
async def disconnect_service(
    service: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Disconnect a Google service."""
    if service not in SERVICE_DB_NAMES:
        raise HTTPException(status_code=400, detail=f"Unknown service: {service}")

    service_name = SERVICE_DB_NAMES[service]

    await db.delete("user_integrations", {"user_id": user_id, "service": service_name})

    logger.info(f"Disconnected {service} for user {user_id}")

    # Update container to remove MCP server
    await update_container_config(user_id)

    return {"status": "disconnected", "service": service}


async def refresh_google_token(user_id: str, service: str) -> str | None:
    """Refresh an expired Google access token.

    Returns new access token or None if refresh failed.
    """
    service_name = SERVICE_DB_NAMES.get(service)
    if not service_name:
        return None

    integration = await db.select(
        "user_integrations",
        filters={"user_id": user_id, "service": service_name},
        single=True,
    )

    if not integration:
        return None

    refresh_token = decrypt(integration["refresh_token_encrypted"])

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
            tokens = resp.json()
    except Exception as e:
        logger.error(f"Token refresh failed for user {user_id}: {e}")
        return None

    access_token = tokens.get("access_token")
    expires_in = tokens.get("expires_in", 3600)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    # Update token in DB
    await db.update(
        "user_integrations",
        {
            "access_token_encrypted": encrypt(access_token),
            "token_expires_at": expires_at.isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        },
        {"user_id": user_id, "service": service_name},
    )

    logger.info(f"Refreshed {service} token for user {user_id}")
    return access_token


async def get_valid_token(user_id: str, service: str) -> str | None:
    """Get a valid access token for a service, refreshing if needed."""
    service_name = SERVICE_DB_NAMES.get(service)
    if not service_name:
        return None

    integration = await db.select(
        "user_integrations",
        filters={"user_id": user_id, "service": service_name},
        single=True,
    )

    if not integration:
        return None

    expires_at = datetime.fromisoformat(integration["token_expires_at"].replace("Z", "+00:00"))

    # Refresh if expires in less than 5 minutes
    if expires_at < datetime.utcnow() + timedelta(minutes=5):
        return await refresh_google_token(user_id, service)

    return decrypt(integration["access_token_encrypted"])


async def update_container_config(user_id: str) -> None:
    """Update running container's config with current integrations.

    Called when user connects/disconnects a service.
    """
    from app.services.container_service import container_service

    # Check if user has a running assistant
    assistant = await db.select("assistants", filters={"user_id": user_id}, single=True)
    if not assistant or assistant["status"] != "READY":
        logger.info(f"No running assistant for user {user_id}, skipping config update")
        return

    gateway_token = decrypt(assistant["gateway_token_encrypted"])

    # Get all integrations with valid tokens
    integrations = await db.select("user_integrations", filters={"user_id": user_id})

    integration_tokens = {}
    for integration in (integrations or []):
        service = integration["service"]

        # Refresh if needed
        service_key = None
        for key, db_name in SERVICE_DB_NAMES.items():
            if db_name == service:
                service_key = key
                break

        if service_key:
            token = await get_valid_token(user_id, service_key)
            if token:
                integration_tokens[service] = token

    # Update container config
    success = await container_service.update_config(
        user_id=user_id,
        gateway_token=gateway_token,
        integrations=integration_tokens,
    )

    if success:
        logger.info(f"Updated container config for user {user_id} with {len(integration_tokens)} integrations")
    else:
        logger.error(f"Failed to update container config for user {user_id}")
