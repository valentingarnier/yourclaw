"""Feedback router — lets authenticated users send feedback via email."""

import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.schemas import FeedbackInput, FeedbackResponse
from app.services.email_service import send_feedback_email

logger = logging.getLogger("yourclaw.feedback")
router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    body: FeedbackInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackResponse:
    """Send feedback from a user to the team via email."""
    # Fetch user email from Supabase auth
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
            headers=headers,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not fetch user info")

    user_email = resp.json().get("email", "unknown")

    await send_feedback_email(
        user_email=user_email,
        user_id=str(user_id),
        message=body.message,
    )
    return FeedbackResponse(status="sent")
