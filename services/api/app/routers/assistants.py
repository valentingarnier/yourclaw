import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.database import db
from app.schemas import AssistantCreateResponse, AssistantResponse

router = APIRouter(prefix="/assistants", tags=["assistants"])


@router.get("", response_model=AssistantResponse)
async def get_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> AssistantResponse:
    """Get current user's assistant status."""

    row = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)

    if not row:
        return AssistantResponse(status="NONE")

    return AssistantResponse(
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.post("", response_model=AssistantCreateResponse, status_code=202)
async def create_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> AssistantCreateResponse:
    """Create or recreate user's assistant.

    Requires active subscription. Creates a provisioning job.
    Idempotent: if already provisioning, returns current status.
    """

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
        return AssistantCreateResponse(status="PROVISIONING")

    # If assistant exists in READY or ERROR state, we'll reprovision
    # First, create/update assistant record to PROVISIONING
    if assistant:
        await db.update(
            "assistants",
            {"status": "PROVISIONING", "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )
    else:
        await db.insert(
            "assistants",
            {"user_id": str(user_id), "status": "PROVISIONING"},
        )

    # Create provisioning job
    await db.insert(
        "provisioning_jobs",
        {"user_id": str(user_id), "status": "PENDING"},
    )

    return AssistantCreateResponse(status="PROVISIONING")


@router.delete("", status_code=204)
async def delete_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> None:
    """Delete user's assistant and stop container.

    Sets status to NONE. Container cleanup handled by worker.
    """

    assistant = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    if not assistant:
        return  # Nothing to delete

    # Mark for deletion (worker will handle container cleanup)
    await db.update(
        "assistants",
        {
            "status": "NONE",
            "container_id": None,
            "port": None,
            "updated_at": datetime.utcnow().isoformat(),
        },
        {"user_id": str(user_id)},
    )
