import uuid
from datetime import date

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import db
from app.schemas import UsageDayResponse, UsageResponse

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("", response_model=UsageResponse)
async def get_usage(user_id: uuid.UUID = Depends(get_current_user)) -> UsageResponse:
    """Get usage stats: today's message counts and credits used."""

    today = date.today().isoformat()

    # Get today's usage
    usage = await db.select(
        "usage_daily",
        filters={"user_id": str(user_id), "date": today},
        single=True,
    )

    today_usage = UsageDayResponse(
        date=today,
        inbound_count=usage["inbound_count"] if usage else 0,
        outbound_count=usage["outbound_count"] if usage else 0,
    )

    # Get credits
    credits = await db.select("user_credits", filters={"user_id": str(user_id)}, single=True)

    return UsageResponse(
        today=today_usage,
        credits_used_cents=credits["used_cents"] if credits else 0,
        credits_total_cents=credits["total_cents"] if credits else 0,
    )
