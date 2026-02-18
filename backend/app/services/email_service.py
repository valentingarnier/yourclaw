"""Email service using Resend.

Handles transactional emails: welcome, cancellation, etc.
"""

import logging

import resend

from app.config import settings

logger = logging.getLogger("yourclaw.email")

WELCOME_EMAIL_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e5e5e5;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      padding: 40px 24px;
    }}
    .logo-row {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }}
    .logo-icon {{
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #10B981, #06B6D4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: #000000;
    }}
    .logo-text {{
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }}
    p {{
      font-size: 15px;
      line-height: 1.6;
      color: #a3a3a3;
      margin: 0 0 16px 0;
    }}
    .highlight {{
      color: #ffffff;
      font-weight: 500;
    }}
    .features {{
      background: #18181b;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 24px 0;
    }}
    .features h2 {{
      font-size: 14px;
      font-weight: 600;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
    }}
    .feature {{
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d4;
      padding: 4px 0;
    }}
    .feature-icon {{
      color: #10B981;
      font-weight: 700;
      margin-right: 10px;
    }}
    .cta {{
      display: inline-block;
      background: linear-gradient(135deg, #10B981, #06B6D4);
      color: #000000;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 24px 0;
    }}
    .footer {{
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #262626;
      font-size: 13px;
      color: #525252;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-row">
      <div class="logo-icon">Y</div>
      <div class="logo-text">YourClaw</div>
    </div>

    <h1>Welcome to YourClaw, {first_name}!</h1>

    <p>Thanks for signing up. You're one step away from having your own AI assistant &mdash; powered by <span class="highlight">OpenClaw</span>, available right on {channel}.</p>

    <div class="features">
      <h2>What your assistant can do</h2>
      <div class="feature"><span class="feature-icon">&#9679;</span> Browse the web and fetch live information</div>
      <div class="feature"><span class="feature-icon">&#9679;</span> Execute code, create files, automate tasks</div>
      <div class="feature"><span class="feature-icon">&#9679;</span> Remember context across conversations</div>
      <div class="feature"><span class="feature-icon">&#9679;</span> Use all OpenClaw tools &mdash; no restrictions</div>
    </div>

    <p>To get started, head to your dashboard and subscribe. Your assistant will be ready in under a minute.</p>

    <a href="{dashboard_url}" class="cta">Go to Dashboard</a>

    <div class="footer">
      <p>Questions? Just reply to this email &mdash; we read everything.</p>
      <p>&mdash; Valentin, YourClaw</p>
    </div>
  </div>
</body>
</html>
"""


SUBSCRIPTION_EMAIL_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e5e5e5;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      padding: 40px 24px;
    }}
    .logo-row {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }}
    .logo-icon {{
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #10B981, #06B6D4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: #000000;
    }}
    .logo-text {{
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }}
    p {{
      font-size: 15px;
      line-height: 1.6;
      color: #a3a3a3;
      margin: 0 0 16px 0;
    }}
    .highlight {{
      color: #ffffff;
      font-weight: 500;
    }}
    .checklist {{
      margin: 24px 0;
      padding: 0;
      list-style: none;
    }}
    .checklist li {{
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d4;
      padding: 4px 0;
    }}
    .check {{
      color: #10B981;
      font-weight: 700;
      margin-right: 10px;
    }}
    .steps {{
      background: #18181b;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 24px 0;
    }}
    .steps h2 {{
      font-size: 14px;
      font-weight: 600;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
    }}
    .step {{
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d4;
      padding: 4px 0;
    }}
    .step-number {{
      color: #10B981;
      font-weight: 600;
      margin-right: 8px;
    }}
    .cta {{
      display: inline-block;
      background: linear-gradient(135deg, #10B981, #06B6D4);
      color: #000000;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 24px 0;
    }}
    .footer {{
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #262626;
      font-size: 13px;
      color: #525252;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-row">
      <div class="logo-icon">Y</div>
      <div class="logo-text">YourClaw</div>
    </div>

    <h1>You're all set, {first_name}!</h1>

    <p>Thank you for your trust. Your subscription is active and your personal OpenClaw assistant is being set up right now &mdash; it usually takes less than a minute.</p>

    <ul class="checklist">
      <li><span class="check">&#10003;</span> Your own dedicated AI server</li>
      <li><span class="check">&#10003;</span> 48h free trial included</li>
      <li><span class="check">&#10003;</span> All tools unlocked &mdash; web, code, files, browser</li>
      <li><span class="check">&#10003;</span> Available 24/7 on {channel}</li>
    </ul>

    <div class="steps">
      <h2>What happens next</h2>
      <div class="step"><span class="step-number">1.</span> We're provisioning your assistant right now</div>
      <div class="step"><span class="step-number">2.</span> You'll get a notification on {channel} when it's ready</div>
      <div class="step"><span class="step-number">3.</span> Just send a message to start chatting</div>
    </div>

    <a href="{dashboard_url}" class="cta">Go to Dashboard</a>

    <div class="footer">
      <p>This is the beginning of something great. If you ever need anything, just reply to this email &mdash; I read every single one.</p>
      <p>&mdash; Valentin, YourClaw</p>
    </div>
  </div>
</body>
</html>
"""


CANCELLATION_EMAIL_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e5e5e5;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      padding: 40px 24px;
    }}
    .logo-row {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }}
    .logo-icon {{
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #10B981, #06B6D4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: #000000;
    }}
    .logo-text {{
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }}
    p {{
      font-size: 15px;
      line-height: 1.6;
      color: #a3a3a3;
      margin: 0 0 16px 0;
    }}
    .info-box {{
      background: #18181b;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 24px 0;
    }}
    .info-box h2 {{
      font-size: 14px;
      font-weight: 600;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
    }}
    .info-item {{
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d4;
      padding: 4px 0;
    }}
    .x-mark {{
      color: #ef4444;
      font-weight: 700;
      margin-right: 10px;
    }}
    .highlight {{
      color: #ffffff;
      font-weight: 500;
    }}
    .cta {{
      display: inline-block;
      background: linear-gradient(135deg, #10B981, #06B6D4);
      color: #000000;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 24px 0;
    }}
    .footer {{
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #262626;
      font-size: 13px;
      color: #525252;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-row">
      <div class="logo-icon">Y</div>
      <div class="logo-text">YourClaw</div>
    </div>

    <h1>Sad to see you go, {first_name}.</h1>

    <p>Your YourClaw subscription has been canceled. Your assistant has been shut down and is no longer available.</p>

    <div class="info-box">
      <h2>What's been removed</h2>
      <div class="info-item"><span class="x-mark">&times;</span>Your dedicated AI assistant</div>
      <div class="info-item"><span class="x-mark">&times;</span>Web browsing &amp; code execution</div>
      <div class="info-item"><span class="x-mark">&times;</span>{channel} messaging</div>
      <div class="info-item"><span class="x-mark">&times;</span>All OpenClaw tools</div>
    </div>

    <p>Your conversation history and workspace files are kept for <span class="highlight">30 days</span> in case you change your mind. After that, they'll be permanently deleted.</p>

    <p>If this was a mistake or you'd like to come back, you can resubscribe anytime from your dashboard &mdash; your assistant will be back in under a minute.</p>

    <a href="{dashboard_url}" class="cta">Resubscribe</a>

    <div class="footer">
      <p>We'd love to know what we could have done better. Just reply to this email &mdash; we read everything.</p>
      <p>&mdash; Valentin, YourClaw</p>
    </div>
  </div>
</body>
</html>
"""


async def send_cancellation_email(email: str, first_name: str, channel: str) -> None:
    """Send cancellation email when subscription is deleted.

    Args:
        email: User's email address
        first_name: User's first name (from Google profile)
        channel: Messaging channel (WhatsApp or Telegram)
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set, skipping cancellation email")
        return

    resend.api_key = settings.resend_api_key

    channel_display = "WhatsApp" if channel == "WHATSAPP" else "Telegram"
    dashboard_url = f"{settings.app_url}/dashboard"

    html = CANCELLATION_EMAIL_HTML.format(
        first_name=first_name or "there",
        channel=channel_display,
        dashboard_url=dashboard_url,
    )

    try:
        resend.Emails.send({
            "from": "Valentin from YourClaw <hello@yourclaw.dev>",
            "to": [email],
            "subject": "Your YourClaw assistant has been shut down",
            "html": html,
        })
        logger.info(f"Cancellation email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send cancellation email to {email}: {e}")


async def send_welcome_email(email: str, first_name: str, channel: str) -> None:
    """Send welcome email when user signs up (sets their channel).

    Args:
        email: User's email address
        first_name: User's first name (from Google profile)
        channel: Messaging channel (WhatsApp or Telegram)
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set, skipping welcome email")
        return

    resend.api_key = settings.resend_api_key

    channel_display = "WhatsApp" if channel == "WHATSAPP" else "Telegram"
    dashboard_url = f"{settings.app_url}/dashboard"

    html = WELCOME_EMAIL_HTML.format(
        first_name=first_name or "there",
        channel=channel_display,
        dashboard_url=dashboard_url,
    )

    try:
        resend.Emails.send({
            "from": "Valentin from YourClaw <hello@yourclaw.dev>",
            "to": [email],
            "subject": f"Welcome to YourClaw, {first_name or 'there'}!",
            "html": html,
        })
        logger.info(f"Welcome email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {email}: {e}")


async def send_subscription_email(email: str, first_name: str, channel: str) -> None:
    """Send thank-you email after successful subscription checkout.

    Args:
        email: User's email address
        first_name: User's first name (from Google profile)
        channel: Messaging channel (WhatsApp or Telegram)
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set, skipping subscription email")
        return

    resend.api_key = settings.resend_api_key

    channel_display = "WhatsApp" if channel == "WHATSAPP" else "Telegram"
    dashboard_url = f"{settings.app_url}/dashboard"

    html = SUBSCRIPTION_EMAIL_HTML.format(
        first_name=first_name or "there",
        channel=channel_display,
        dashboard_url=dashboard_url,
    )

    try:
        resend.Emails.send({
            "from": "Valentin from YourClaw <hello@yourclaw.dev>",
            "to": [email],
            "subject": "You're all set — your assistant is on the way!",
            "html": html,
        })
        logger.info(f"Subscription email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send subscription email to {email}: {e}")


async def add_resend_contact(email: str, first_name: str, last_name: str = "") -> None:
    """Add a new subscriber as a contact in Resend's General audience."""
    if not settings.resend_api_key:
        return

    resend.api_key = settings.resend_api_key

    try:
        resend.Contacts.create({
            "audience_id": "4cd8abe1-a7ff-4ad8-b45b-ab6b88900efb",
            "email": email,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "unsubscribed": False,
        })
        logger.info(f"Resend contact created for {email}")
    except Exception as e:
        logger.error(f"Failed to create Resend contact for {email}: {e}")


async def send_feedback_email(
    user_email: str, user_id: str, message: str
) -> None:
    """Send user feedback to hello@yourclaw.dev."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set, skipping feedback email")
        return

    resend.api_key = settings.resend_api_key

    try:
        payload: dict = {
            "from": "YourClaw Notifications <hello@yourclaw.dev>",
            "to": ["hello@yourclaw.dev"],
            "subject": f"Feedback from {user_email}",
            "html": (
                f"<h2>New feedback</h2>"
                f"<p><strong>From:</strong> {user_email}</p>"
                f"<p><strong>User ID:</strong> {user_id}</p>"
                f"<hr>"
                f"<p>{message}</p>"
            ),
        }
        # Only set reply_to for real email addresses (skip dev@localhost etc.)
        if "@" in user_email and "." in user_email.split("@")[-1]:
            payload["reply_to"] = user_email
        resend.Emails.send(payload)
        logger.info(f"Feedback email sent from {user_email}")
    except Exception as e:
        logger.error(f"Failed to send feedback email from {user_email}: {e}")


async def send_new_subscriber_notification(
    email: str, first_name: str, channel: str, user_id: str
) -> None:
    """Send internal notification to hello@yourclaw.dev when a new user subscribes."""
    if not settings.resend_api_key:
        return

    resend.api_key = settings.resend_api_key

    channel_display = "WhatsApp" if channel == "WHATSAPP" else "Telegram"

    try:
        resend.Emails.send({
            "from": "YourClaw Notifications <hello@yourclaw.dev>",
            "to": ["hello@yourclaw.dev"],
            "subject": f"New subscriber: {first_name or 'Unknown'} ({email})",
            "html": (
                f"<h2>New YourClaw subscriber</h2>"
                f"<p><strong>Name:</strong> {first_name or 'N/A'}</p>"
                f"<p><strong>Email:</strong> {email}</p>"
                f"<p><strong>Channel:</strong> {channel_display}</p>"
                f"<p><strong>User ID:</strong> {user_id}</p>"
            ),
        })
        logger.info(f"New subscriber notification sent for {email}")
    except Exception as e:
        logger.error(f"Failed to send subscriber notification for {email}: {e}")
