import logging
from datetime import datetime

import httpx
import stripe
from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.database import db
from app.services.email_service import (
    send_cancellation_email,
    send_new_subscriber_notification,
    send_subscription_email,
)

logger = logging.getLogger("yourclaw.webhooks")

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

stripe.api_key = settings.stripe_secret_key


@router.post("/stripe")
async def stripe_webhook(request: Request) -> dict:
    """Handle Stripe webhook events.

    Events: checkout.session.completed, invoice.payment_succeeded,
    invoice.payment_failed, customer.subscription.deleted
    """
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature", "")

    if settings.mock_stripe:
        # In mock mode, parse payload directly
        import json
        event = json.loads(payload)
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.stripe_webhook_secret
            )
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe event: {event_type}")

    if event_type == "checkout.session.completed":
        await handle_checkout_completed(data)
    elif event_type == "invoice.payment_succeeded":
        await handle_invoice_paid(data)
    elif event_type == "invoice.payment_failed":
        await handle_invoice_failed(data)
    elif event_type == "customer.subscription.updated":
        await handle_subscription_updated(data)
    elif event_type == "customer.subscription.deleted":
        await handle_subscription_deleted(data)

    return {"status": "ok"}


async def handle_checkout_completed(session: dict) -> None:
    """Handle successful checkout: create subscription + credits + trigger provisioning."""
    user_id = session["metadata"]["user_id"]
    customer_id = session["customer"]
    subscription_id = session["subscription"]

    # Create subscription record
    await db.upsert(
        "subscriptions",
        {
            "user_id": user_id,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "status": "ACTIVE",
        },
        on_conflict="user_id",
    )

    # Create credits
    await db.upsert(
        "user_credits",
        {
            "user_id": user_id,
            "total_cents": 1000,  # $10
            "used_cents": 0,
        },
        on_conflict="user_id",
    )

    logger.info(f"Checkout completed for user {user_id}")

    # Send subscription thank-you email (best-effort)
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
                # Extract first name from Google metadata
                meta = user_data.get("user_metadata", {})
                first_name = meta.get("name", "").split(" ")[0] if meta.get("name") else ""
                # Get channel
                phone_row = await db.select("user_phones", filters={"user_id": user_id}, single=True)
                channel = phone_row["channel"] if phone_row else "TELEGRAM"

                if email:
                    await send_subscription_email(email, first_name, channel)
                    await send_new_subscriber_notification(email, first_name, channel, user_id)
    except Exception as e:
        logger.error(f"Failed to send welcome email for user {user_id}: {e}")


async def handle_invoice_paid(invoice: dict) -> None:
    """Handle successful invoice: renew period, reset credits."""
    subscription_id = invoice["subscription"]

    # Find subscription by stripe_subscription_id
    sub = await db.select(
        "subscriptions",
        filters={"stripe_subscription_id": subscription_id},
        single=True,
    )
    if not sub:
        return

    user_id = sub["user_id"]

    # Update subscription period
    await db.update(
        "subscriptions",
        {
            "status": "ACTIVE",
            "updated_at": datetime.utcnow().isoformat(),
        },
        {"user_id": user_id},
    )

    # Reset credits
    await db.update(
        "user_credits",
        {"used_cents": 0, "updated_at": datetime.utcnow().isoformat()},
        {"user_id": user_id},
    )

    logger.info(f"Invoice paid for user {user_id}")


async def handle_invoice_failed(invoice: dict) -> None:
    """Handle failed invoice: mark subscription as PAST_DUE."""
    subscription_id = invoice["subscription"]

    sub = await db.select(
        "subscriptions",
        filters={"stripe_subscription_id": subscription_id},
        single=True,
    )
    if not sub:
        return

    await db.update(
        "subscriptions",
        {"status": "PAST_DUE", "updated_at": datetime.utcnow().isoformat()},
        {"user_id": sub["user_id"]},
    )

    logger.info(f"Invoice failed for user {sub['user_id']}")


async def handle_subscription_deleted(subscription: dict) -> None:
    """Handle subscription cancellation: mark CANCELED, stop container."""
    subscription_id = subscription["id"]

    sub = await db.select(
        "subscriptions",
        filters={"stripe_subscription_id": subscription_id},
        single=True,
    )
    if not sub:
        return

    user_id = sub["user_id"]

    # Mark subscription canceled
    await db.update(
        "subscriptions",
        {"status": "CANCELED", "updated_at": datetime.utcnow().isoformat()},
        {"user_id": user_id},
    )

    # Mark assistant as NONE
    await db.update(
        "assistants",
        {"status": "NONE", "updated_at": datetime.utcnow().isoformat()},
        {"user_id": user_id},
    )

    logger.info(f"Subscription canceled for user {user_id}")

    # Send cancellation email (best-effort)
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
                first_name = meta.get("name", "").split(" ")[0] if meta.get("name") else ""
                phone_row = await db.select("user_phones", filters={"user_id": user_id}, single=True)
                channel = phone_row["channel"] if phone_row else "TELEGRAM"

                if email:
                    await send_cancellation_email(email, first_name, channel)
    except Exception as e:
        logger.error(f"Failed to send cancellation email for user {user_id}: {e}")


async def handle_subscription_updated(subscription: dict) -> None:
    """Handle subscription updates: sync cancel_at_period_end and period end."""
    subscription_id = subscription["id"]

    sub = await db.select(
        "subscriptions",
        filters={"stripe_subscription_id": subscription_id},
        single=True,
    )
    if not sub:
        return

    user_id = sub["user_id"]

    update_data: dict = {"updated_at": datetime.utcnow().isoformat()}

    if "current_period_end" in subscription and subscription["current_period_end"]:
        update_data["current_period_end"] = datetime.fromtimestamp(
            subscription["current_period_end"]
        ).isoformat()

    # Map Stripe status to our status
    stripe_status = subscription.get("status")
    if stripe_status == "active":
        update_data["status"] = "ACTIVE"
    elif stripe_status == "past_due":
        update_data["status"] = "PAST_DUE"

    await db.update("subscriptions", update_data, {"user_id": user_id})

    logger.info(
        f"Subscription updated for user {user_id}: "
        f"cancel_at_period_end={subscription.get('cancel_at_period_end')}"
    )
