import hashlib
import hmac
import logging
from base64 import b64encode
from datetime import date, datetime

import httpx
import stripe
from fastapi import APIRouter, HTTPException, Request, Response

from app.config import settings
from app.database import db
from app.services.email_service import (
    send_cancellation_email,
    send_new_subscriber_notification,
    send_welcome_email,
)
from app.services.encryption import decrypt

logger = logging.getLogger("yourclaw.webhooks")

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

stripe.api_key = settings.stripe_secret_key


def validate_twilio_signature(request_url: str, params: dict, signature: str) -> bool:
    """Validate Twilio webhook signature using HMAC-SHA1."""
    if settings.mock_twilio or settings.skip_twilio_signature:
        return True

    # Build the string to sign: URL + sorted params (key+value concatenated, no encoding)
    sorted_params = "".join(f"{k}{v}" for k, v in sorted(params.items()))
    data = request_url + sorted_params

    # Compute expected signature
    expected = b64encode(
        hmac.new(
            settings.twilio_auth_token.encode(),
            data.encode(),
            hashlib.sha1,
        ).digest()
    ).decode()

    logger.info(f"  Data to sign: {data[:100]}...")
    logger.info(f"  Expected sig: {expected}")
    logger.info(f"  Received sig: {signature}")

    return hmac.compare_digest(expected, signature)


@router.post("/twilio/whatsapp")
async def twilio_whatsapp(request: Request) -> Response:
    """Handle inbound WhatsApp messages from Twilio.

    Validates signature, routes to user's Openclaw container, sends reply.
    """
    form = await request.form()
    params = dict(form)

    # Validate Twilio signature
    # Reconstruct URL using forwarded headers (for ngrok/proxies)
    signature = request.headers.get("X-Twilio-Signature", "")
    proto = request.headers.get("X-Forwarded-Proto", request.url.scheme)
    host = request.headers.get("X-Forwarded-Host", request.headers.get("Host", request.url.netloc))
    request_url = f"{proto}://{host}{request.url.path}"

    logger.info(f"Twilio signature validation:")
    logger.info(f"  Proto: {proto}, Host: {host}")
    logger.info(f"  Reconstructed URL: {request_url}")
    logger.info(f"  Signature: {signature}")
    logger.info(f"  Params: {list(params.keys())}")

    if not validate_twilio_signature(request_url, params, signature):
        logger.warning(f"Signature validation failed for URL: {request_url}")
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    # Parse message
    from_number = params.get("From", "").replace("whatsapp:", "")
    to_number = params.get("To", "")  # The Twilio number user messaged (use as reply sender)
    body = params.get("Body", "")
    message_sid = params.get("MessageSid", "")

    if not from_number or not body:
        return Response(content="<Response></Response>", media_type="application/xml")

    logger.info(f"Inbound WhatsApp from {from_number} to {to_number}: {body[:50]}...")

    # Lookup user by phone
    phone_row = await db.select("user_phones", filters={"phone_e164": from_number}, single=True)
    if not phone_row:
        logger.warning(f"Unknown phone number: {from_number}")
        return Response(content="<Response></Response>", media_type="application/xml")

    user_id = phone_row["user_id"]

    # Reply mode: TwiML inline (works without Meta approval for outbound)
    # TODO: Switch to REST API once Meta approves WhatsApp Business Account for outbound
    # is_production_rest = "+14155238886" not in to_number  # Re-enable when approved

    async def reply_message(msg: str) -> Response:
        """Send reply via TwiML inline response."""
        import html
        escaped = html.escape(msg)
        return Response(content=f"<Response><Message>{escaped}</Message></Response>", media_type="application/xml")

    # Check assistant is ready
    assistant = await db.select("assistants", filters={"user_id": user_id}, single=True)
    if not assistant or assistant["status"] != "READY":
        logger.warning(f"Assistant not ready for user {user_id}")
        return await reply_message("Your assistant is not ready yet. Please wait.")

    # Check rate limits
    today = date.today().isoformat()
    usage = await db.select("usage_daily", filters={"user_id": user_id, "date": today}, single=True)

    if usage and usage["inbound_count"] >= settings.rate_limit_msg_per_day:
        return await reply_message("Daily message limit reached. Try again tomorrow.")

    # Check credits (if using shared key)
    api_key = await db.select("api_keys", filters={"user_id": user_id, "provider": "ANTHROPIC"}, single=True)
    if not api_key:
        # Using shared key, check credits
        credits = await db.select("user_credits", filters={"user_id": user_id}, single=True)
        if credits and credits["used_cents"] >= credits["total_cents"]:
            return await reply_message("API credits exhausted. Add your own API key or upgrade.")

    # Record inbound message
    await db.insert("messages", {
        "user_id": user_id,
        "direction": "INBOUND",
        "body": body,
        "twilio_sid": message_sid,
    })

    # Update usage
    if usage:
        await db.update(
            "usage_daily",
            {"inbound_count": usage["inbound_count"] + 1},
            {"user_id": user_id, "date": today},
        )
    else:
        await db.insert("usage_daily", {
            "user_id": user_id,
            "date": today,
            "inbound_count": 1,
            "outbound_count": 0,
        })

    # Call Openclaw container with conversation history
    host_ip = settings.host_server_ip
    port = assistant["port"]
    gateway_token = decrypt(assistant["gateway_token_encrypted"])

    # Get conversation history (includes the message we just inserted)
    conversation = await get_conversation_history(user_id, limit=10)
    logger.info(f"Conversation history: {len(conversation)} messages")

    try:
        reply = await call_openclaw(host_ip, port, gateway_token, conversation)
    except Exception as e:
        logger.error(f"Openclaw error: {e}")
        reply = "Sorry, I encountered an error. Please try again."

    # Record outbound message
    await db.insert("messages", {
        "user_id": user_id,
        "direction": "OUTBOUND",
        "body": reply,
    })

    # Update outbound usage
    usage = await db.select("usage_daily", filters={"user_id": user_id, "date": today}, single=True)
    await db.update(
        "usage_daily",
        {"outbound_count": usage["outbound_count"] + 1},
        {"user_id": user_id, "date": today},
    )

    # Deduct credits (rough estimate: $0.003 per message pair)
    if not api_key:
        credits = await db.select("user_credits", filters={"user_id": user_id}, single=True)
        if credits:
            await db.update(
                "user_credits",
                {"used_cents": credits["used_cents"] + 1, "updated_at": datetime.utcnow().isoformat()},
                {"user_id": user_id},
            )

    # Send reply (TwiML for sandbox, REST API for production)
    logger.info("Sending reply via TwiML inline")
    return await reply_message(reply)


async def call_openclaw(host_ip: str, port: int, token: str, messages: list[dict]) -> str:
    """Call Openclaw container's chat completions API.

    Args:
        host_ip: Host server IP
        port: Container port
        token: Gateway auth token
        messages: Conversation history as list of {"role": "user"|"assistant", "content": "..."}
    """
    if settings.mock_containers:
        return f"[Mock] I received: {messages[-1]['content'] if messages else 'nothing'}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"http://{host_ip}:{port}/v1/chat/completions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "model": "openclaw:main",
                "messages": messages,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def get_conversation_history(user_id: str, limit: int = 20) -> list[dict]:
    """Fetch recent messages for a user and format as conversation history.

    Args:
        user_id: User's UUID
        limit: Max messages to retrieve (default 20 = 10 exchanges)

    Returns:
        List of messages formatted for chat completions API
    """
    # Fetch recent messages ordered by created_at
    messages = await db.select(
        "messages",
        filters={"user_id": user_id},
        order_by="created_at",
        order_desc=True,
        limit=limit,
    )

    if not messages:
        return []

    # Reverse to get chronological order (oldest first)
    messages = list(reversed(messages))

    # Convert to chat format
    history = []
    for msg in messages:
        role = "user" if msg["direction"] == "INBOUND" else "assistant"
        history.append({"role": role, "content": msg["body"]})

    return history


async def send_twilio_message(to_number: str, body: str, from_number: str | None = None) -> None:
    """Send WhatsApp message via Twilio.

    Args:
        to_number: Recipient phone number (E.164 format, no whatsapp: prefix)
        body: Message body
        from_number: Sender (Twilio WhatsApp number with whatsapp: prefix).
                     If None, uses TWILIO_WHATSAPP_NUMBER from env.
    """
    if settings.mock_twilio:
        logger.info(f"[Mock Twilio] To {to_number}: {body[:100]}...")
        return

    from twilio.rest import Client

    sender = from_number or settings.twilio_whatsapp_number
    logger.info(f"Sending Twilio message: from={sender}, to=whatsapp:{to_number}")
    logger.info(f"Message body length: {len(body)}, content: {body[:200]}...")

    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    message = client.messages.create(
        from_=sender,
        to=f"whatsapp:{to_number}",
        body=body,
    )
    logger.info(f"Twilio message sent: SID={message.sid}, status={message.status}")


async def send_twilio_template(to_number: str, content_sid: str, from_number: str | None = None) -> None:
    """Send WhatsApp template message via Twilio Content API.

    Template messages can be sent outside the 24-hour session window.

    Args:
        to_number: Recipient phone number (E.164 format, no whatsapp: prefix)
        content_sid: Twilio Content Template SID (starts with HX)
        from_number: Sender (Twilio WhatsApp number with whatsapp: prefix).
                     If None, uses TWILIO_WHATSAPP_NUMBER from env.
    """
    if settings.mock_twilio:
        logger.info(f"[Mock Twilio Template] To {to_number}, template={content_sid}")
        return

    from twilio.rest import Client

    sender = from_number or settings.twilio_whatsapp_number
    logger.info(f"Sending Twilio template: from={sender}, to=whatsapp:{to_number}, content_sid={content_sid}")

    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    message = client.messages.create(
        from_=sender,
        to=f"whatsapp:{to_number}",
        content_sid=content_sid,
    )
    logger.info(f"Twilio template sent: SID={message.sid}, status={message.status}")


async def send_telegram_message(chat_id: int, text: str) -> None:
    """Send a message via Telegram Bot API.

    Splits long messages at the 4096-char Telegram limit.
    Falls back to plain text if Markdown parsing fails.
    """
    if settings.mock_telegram:
        logger.info(f"[Mock Telegram] To chat_id={chat_id}: {text[:100]}...")
        return

    chunks = [text[i:i + 4096] for i in range(0, len(text), 4096)]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for chunk in chunks:
            resp = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": chunk, "parse_mode": "Markdown"},
            )
            if resp.status_code != 200:
                # Retry without Markdown (in case formatting breaks)
                await client.post(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                    json={"chat_id": chat_id, "text": chunk},
                )


@router.post("/telegram")
async def telegram_webhook(request: Request) -> dict:
    """Handle inbound Telegram messages from Bot API webhook.

    Returns 200 immediately. Sends reply asynchronously via Bot API (no timeout!).
    """
    # Validate secret token
    if settings.telegram_webhook_secret:
        header_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if header_token != settings.telegram_webhook_secret:
            raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")

    body = await request.json()

    # Only handle text messages
    message = body.get("message")
    if not message or "text" not in message:
        return {"ok": True}

    chat_id = message["chat"]["id"]
    text = message["text"]
    from_user = message.get("from", {})
    username = (from_user.get("username") or "").lower()
    message_id = message["message_id"]

    logger.info(f"Inbound Telegram from @{username} (chat_id={chat_id}): {text[:50]}...")

    # Handle /start command
    if text.strip() == "/start":
        text = "Hello!"

    # Lookup user by telegram_chat_id (fast path for connected users)
    phone_row = await db.select(
        "user_phones",
        filters={"telegram_chat_id": chat_id, "channel": "TELEGRAM"},
        single=True,
    )

    if not phone_row and username:
        # Slow path: first message — try matching by username
        phone_row = await db.select(
            "user_phones",
            filters={"telegram_username": username, "channel": "TELEGRAM"},
            single=True,
        )
        if phone_row and not phone_row.get("telegram_chat_id"):
            # Link chat_id for future lookups
            await db.update(
                "user_phones",
                {"telegram_chat_id": chat_id},
                {"user_id": phone_row["user_id"]},
            )
            logger.info(f"Linked Telegram @{username} -> chat_id {chat_id} for user {phone_row['user_id']}")

    if not phone_row:
        await send_telegram_message(chat_id, "Hi! I don't recognize your account. Please sign up at yourclaw.dev and enter your Telegram username.")
        return {"ok": True}

    user_id = phone_row["user_id"]

    # Check assistant is ready
    assistant = await db.select("assistants", filters={"user_id": user_id}, single=True)
    if not assistant or assistant["status"] != "READY":
        await send_telegram_message(chat_id, "Your assistant is not ready yet. Please wait for setup to complete.")
        return {"ok": True}

    # Check rate limits
    today = date.today().isoformat()
    usage = await db.select("usage_daily", filters={"user_id": user_id, "date": today}, single=True)
    if usage and usage["inbound_count"] >= settings.rate_limit_msg_per_day:
        await send_telegram_message(chat_id, "Daily message limit reached. Try again tomorrow.")
        return {"ok": True}

    # Check credits (if using shared key)
    api_key = await db.select("api_keys", filters={"user_id": user_id, "provider": "ANTHROPIC"}, single=True)
    if not api_key:
        credits = await db.select("user_credits", filters={"user_id": user_id}, single=True)
        if credits and credits["used_cents"] >= credits["total_cents"]:
            await send_telegram_message(chat_id, "API credits exhausted. Add your own API key or upgrade.")
            return {"ok": True}

    # Record inbound message
    await db.insert("messages", {
        "user_id": user_id,
        "direction": "INBOUND",
        "body": text,
        "channel": "TELEGRAM",
        "telegram_message_id": message_id,
    })

    # Update usage
    if usage:
        await db.update(
            "usage_daily",
            {"inbound_count": usage["inbound_count"] + 1},
            {"user_id": user_id, "date": today},
        )
    else:
        await db.insert("usage_daily", {
            "user_id": user_id,
            "date": today,
            "inbound_count": 1,
            "outbound_count": 0,
        })

    # Call Openclaw container (async — no timeout limitation on Telegram!)
    host_ip = settings.host_server_ip
    port = assistant["port"]
    gateway_token = decrypt(assistant["gateway_token_encrypted"])

    # Telegram can use 20 messages of history (no TwiML timeout constraint)
    conversation = await get_conversation_history(user_id, limit=20)
    logger.info(f"Telegram conversation history: {len(conversation)} messages")

    try:
        reply = await call_openclaw(host_ip, port, gateway_token, conversation)
    except Exception as e:
        logger.error(f"Openclaw error for Telegram user {user_id}: {e}")
        reply = "Sorry, I encountered an error. Please try again."

    # Record outbound message
    await db.insert("messages", {
        "user_id": user_id,
        "direction": "OUTBOUND",
        "body": reply,
        "channel": "TELEGRAM",
    })

    # Update outbound usage
    usage = await db.select("usage_daily", filters={"user_id": user_id, "date": today}, single=True)
    await db.update(
        "usage_daily",
        {"outbound_count": usage["outbound_count"] + 1},
        {"user_id": user_id, "date": today},
    )

    # Deduct credits
    if not api_key:
        credits = await db.select("user_credits", filters={"user_id": user_id}, single=True)
        if credits:
            await db.update(
                "user_credits",
                {"used_cents": credits["used_cents"] + 1, "updated_at": datetime.utcnow().isoformat()},
                {"user_id": user_id},
            )

    # Send reply via Telegram Bot API (async, no timeout!)
    await send_telegram_message(chat_id, reply)

    return {"ok": True}


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

    # Create provisioning job (auto-start assistant)
    await db.insert("provisioning_jobs", {
        "user_id": user_id,
        "status": "PENDING",
    })

    # Create assistant record
    await db.upsert(
        "assistants",
        {"user_id": user_id, "status": "PROVISIONING"},
        on_conflict="user_id",
    )

    logger.info(f"Checkout completed for user {user_id}")

    # Send welcome email (best-effort)
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
                channel = phone_row["channel"] if phone_row else "WHATSAPP"

                if email:
                    await send_welcome_email(email, first_name, channel)
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

    # Mark assistant as NONE (worker will stop container)
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
                channel = phone_row["channel"] if phone_row else "WHATSAPP"

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
