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

router = APIRouter(prefix="/assistants", tags=["assistants"])


@router.get("", response_model=AssistantResponse)
async def get_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> AssistantResponse:
    """Get current user's assistant status."""

    row = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)

    if not row:
        return AssistantResponse(status="NONE")

    return AssistantResponse(
        status=row["status"],
        model=row.get("model", DEFAULT_MODEL),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.post("", response_model=AssistantCreateResponse, status_code=202)
async def create_assistant(
    body: AssistantCreateInput = AssistantCreateInput(),
    user_id: uuid.UUID = Depends(get_current_user),
) -> AssistantCreateResponse:
    """Create or recreate user's assistant.

    Requires active subscription. Creates a provisioning job.
    Idempotent: if already provisioning, returns current status.
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
        return AssistantCreateResponse(status="PROVISIONING", model=assistant.get("model", DEFAULT_MODEL))

    # If assistant exists in READY or ERROR state, we'll reprovision
    # First, create/update assistant record to PROVISIONING
    if assistant:
        await db.update(
            "assistants",
            {"status": "PROVISIONING", "model": model, "updated_at": datetime.utcnow().isoformat()},
            {"user_id": str(user_id)},
        )
    else:
        await db.insert(
            "assistants",
            {"user_id": str(user_id), "status": "PROVISIONING", "model": model},
        )

    # Create provisioning job
    await db.insert(
        "provisioning_jobs",
        {"user_id": str(user_id), "status": "PENDING"},
    )

    return AssistantCreateResponse(status="PROVISIONING", model=model)


@router.patch("", response_model=AssistantResponse)
async def update_assistant(
    body: AssistantUpdateInput,
    user_id: uuid.UUID = Depends(get_current_user),
) -> AssistantResponse:
    """Update assistant settings (e.g., model).

    Triggers reprovisioning to apply changes.
    """

    # Validate model
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

    # Update model and trigger reprovisioning
    await db.update(
        "assistants",
        {"status": "PROVISIONING", "model": body.model, "updated_at": datetime.utcnow().isoformat()},
        {"user_id": str(user_id)},
    )

    # Create provisioning job to apply the new model
    await db.insert(
        "provisioning_jobs",
        {"user_id": str(user_id), "status": "PENDING"},
    )

    return AssistantResponse(
        status="PROVISIONING",
        model=body.model,
        created_at=assistant["created_at"],
        updated_at=datetime.utcnow().isoformat(),
    )


@router.delete("", status_code=204)
async def delete_assistant(user_id: uuid.UUID = Depends(get_current_user)) -> None:
    """Delete user's assistant and stop container.

    Sets status to NONE. Container cleanup handled by worker.
    """

    assistant = await db.select("assistants", filters={"user_id": str(user_id)}, single=True)
    if not assistant:
        return  # Nothing to delete

    # Mark for deletion (worker will handle container cleanup)
    # Keep container_id and port so worker knows what to clean up
    await db.update(
        "assistants",
        {
            "status": "NONE",
            "updated_at": datetime.utcnow().isoformat(),
        },
        {"user_id": str(user_id)},
    )
