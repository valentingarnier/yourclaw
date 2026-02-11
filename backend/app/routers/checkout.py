import logging
import uuid
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import settings
from app.database import db
from app.schemas import CancelResponse, CheckoutResponse, SubscriptionResponse

logger = logging.getLogger("yourclaw.checkout")

router = APIRouter(tags=["payments"])

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(user_id: uuid.UUID = Depends(get_current_user)) -> CheckoutResponse:
    """Create a Stripe Checkout session for subscription.

    Returns checkout URL for frontend to redirect to.
    """

    if settings.mock_stripe:
        # In mock mode, return a fake URL
        return CheckoutResponse(checkout_url=f"{settings.app_url}/dashboard?mock_payment=true")

    # Check if user already has active subscription
    sub = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
    if sub and sub["status"] == "ACTIVE":
        raise HTTPException(status_code=400, detail="Already subscribed")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price": settings.stripe_price_id,
                    "quantity": 1,
                }
            ],
            subscription_data={
                "trial_period_days": 2,
            },
            metadata={"user_id": str(user_id)},
            success_url=f"{settings.app_url}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.app_url}/dashboard",
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}")

    return CheckoutResponse(checkout_url=session.url)


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(user_id: uuid.UUID = Depends(get_current_user)) -> SubscriptionResponse:
    """Get current subscription status and details."""

    sub = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
    credits = await db.select("user_credits", filters={"user_id": str(user_id)}, single=True)

    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    credits_remaining = 0
    if credits:
        credits_remaining = credits["total_cents"] - credits["used_cents"]

    # Fetch live data from Stripe for cancel_at_period_end and trial info
    cancel_at_period_end = False
    trial_end = None
    current_period_end = sub.get("current_period_end")

    if not settings.mock_stripe and sub.get("stripe_subscription_id"):
        try:
            stripe_sub = stripe.Subscription.retrieve(sub["stripe_subscription_id"])
            cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
            stripe_trial_end = stripe_sub.get("trial_end")
            if stripe_trial_end:
                trial_end = datetime.fromtimestamp(stripe_trial_end)
            stripe_period_end = stripe_sub.get("current_period_end")
            if stripe_period_end:
                current_period_end = datetime.fromtimestamp(stripe_period_end).isoformat()
        except stripe.StripeError as e:
            logger.warning(f"Failed to fetch Stripe subscription: {e}")

    return SubscriptionResponse(
        status=sub["status"],
        credits_remaining_cents=credits_remaining,
        current_period_end=current_period_end,
        cancel_at_period_end=cancel_at_period_end,
        trial_end=trial_end,
    )


@router.post("/subscription/cancel", response_model=CancelResponse)
async def cancel_subscription(user_id: uuid.UUID = Depends(get_current_user)) -> CancelResponse:
    """Cancel subscription at period end. User keeps access until current_period_end."""

    sub = await db.select("subscriptions", filters={"user_id": str(user_id)}, single=True)
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    if sub["status"] != "ACTIVE":
        raise HTTPException(status_code=400, detail="Cannot cancel inactive subscription")

    if settings.mock_stripe:
        return CancelResponse(
            status="scheduled",
            cancels_at=sub.get("current_period_end"),
        )

    try:
        stripe_sub = stripe.Subscription.modify(
            sub["stripe_subscription_id"],
            cancel_at_period_end=True,
        )

        # Update current_period_end in DB from Stripe response
        stripe_period_end = stripe_sub.get("current_period_end")
        if stripe_period_end:
            period_end = datetime.fromtimestamp(stripe_period_end)
            await db.update(
                "subscriptions",
                {
                    "current_period_end": period_end.isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                },
                {"user_id": str(user_id)},
            )

        return CancelResponse(
            status="scheduled",
            cancels_at=datetime.fromtimestamp(stripe_period_end).isoformat()
            if stripe_period_end
            else None,
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}")
