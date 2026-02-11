"""Email service using Resend.

Handles transactional emails: welcome, payment confirmations, etc.
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

    <h1>Welcome, {first_name}!</h1>

    <p>You're in. Your OpenClaw assistant is being set up right now &mdash; it usually takes less than a minute.</p>

    <ul class="checklist">
      <li><span class="check">&#10003;</span>Your own dedicated AI assistant</li>
      <li><span class="check">&#10003;</span>Web browsing, code execution, file creation</li>
      <li><span class="check">&#10003;</span>48h free trial + $10 in AI credits</li>
      <li><span class="check">&#10003;</span>All OpenClaw tools, no restrictions</li>
    </ul>

    <div class="steps">
      <h2>What happens next</h2>
      <div class="step"><span class="step-number">1.</span> We're provisioning your assistant right now</div>
      <div class="step"><span class="step-number">2.</span> Head to your dashboard to check the status</div>
      <div class="step"><span class="step-number">3.</span> Once ready, send a message on {channel} to start chatting</div>
    </div>

    <a href="{dashboard_url}" class="cta">Go to Dashboard</a>

    <div class="footer">
      <p>Questions? Just reply to this email &mdash; we read everything.</p>
      <p>&mdash; The YourClaw Team</p>
    </div>
  </div>
</body>
</html>
"""


async def send_welcome_email(email: str, first_name: str, channel: str) -> None:
    """Send welcome email after successful subscription.

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
            "subject": "Welcome to YourClaw — your assistant is on the way!",
            "html": html,
        })
        logger.info(f"Welcome email sent to {email}")
    except Exception as e:
        # Best-effort — don't fail the checkout flow
        logger.error(f"Failed to send welcome email to {email}: {e}")
