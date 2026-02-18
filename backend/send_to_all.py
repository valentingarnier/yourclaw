"""Send announcement email to all production users."""

import json
import os
import time
import requests
import resend

RESEND_API_KEY = os.environ["RESEND_API_KEY"]
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jqqnosjfmotusghzhjvg.supabase.co")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

ANNOUNCEMENT_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1a1a1a;">

  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden;">
    WhatsApp, Telegram, built-in browser, sub-agents and more — here's what's new.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px; border-bottom:1px solid #e5e5e5;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:28px; height:28px;">
                    <img src="https://yourclaw.dev/lobster-logo.png" alt="YourClaw" width="28" height="28" style="display:block; border:0; border-radius:6px;" />
                  </td>
                  <td style="padding-left:8px; font-size:20px; font-weight:700; color:#111;">YourClaw</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top:28px;">
              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.7; color:#333;">Hi {first_name},</p>

              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.7; color:#333;">We've been working hard on YourClaw over the past weeks and just shipped a big update. Here's what's new:</p>

              <p style="margin:0 0 6px 0; font-size:15px; line-height:1.7; color:#333;"><strong>WhatsApp &amp; Telegram support</strong></p>
              <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#555;">YourClaw now works on both WhatsApp and Telegram. WhatsApp is fully operational — connect your number, scan a QR code, and you're set. We've also deeply improved Telegram: it's faster, more reliable, and honestly the smoothest way to chat with your assistant right now.</p>

              <p style="margin:0 0 6px 0; font-size:15px; line-height:1.7; color:#333;"><strong>A built-in web browser</strong></p>
              <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#555;">Your assistant now has its own browser. It can search the internet, read pages, fill out forms, and interact with websites — all on your behalf. Just ask.</p>

              <p style="margin:0 0 6px 0; font-size:15px; line-height:1.7; color:#333;"><strong>Reminders, code, and deployment — from chat</strong></p>
              <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#555;">Set reminders with a message. Your assistant can also write code, create files, and even deploy projects for you — no terminal, no IDE, just chat.</p>

              <p style="margin:0 0 6px 0; font-size:15px; line-height:1.7; color:#333;"><strong>Sub-agents</strong></p>
              <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#555;">You can now create smaller, specialized assistants that work alongside your main one. Give them specific tasks and let them run in parallel — like having a team in your chat.</p>

              <p style="margin:0 0 6px 0; font-size:15px; line-height:1.7; color:#333;"><strong>Cheaper AI models</strong></p>
              <p style="margin:0 0 18px 0; font-size:15px; line-height:1.7; color:#555;">Not every task needs the most powerful model. With our Vercel AI Gateway integration, you can switch to more affordable models like MiniMax, DeepSeek, or Kimi for everyday conversations. Same assistant, same tools — way cheaper to run.</p>

              <p style="margin:0 0 6px 0; font-size:15px; line-height:1.7; color:#333;"><strong>Coming soon: a dashboard for all your agents</strong></p>
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.7; color:#555;">We're integrating with Tailscale so you'll be able to see every agent you've created, chat with any of them, and watch exactly what they're doing in their browser — all from one screen.</p>

              <!-- Trial + CTA -->
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.7; color:#333;">You can try everything with a <strong>48-hour free trial</strong>. If it's not for you, cancel anytime — you won't be charged.</p>

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#111; border-radius:6px;">
                    <a href="https://yourclaw.dev/dashboard" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">Set up YourClaw now</a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <p style="margin:32px 0 0 0; font-size:15px; line-height:1.7; color:#333;">If you have any questions, just reply to this email — I read every one.</p>

              <p style="margin:20px 0 0 0; font-size:15px; line-height:1.7; color:#333;">
                Talk soon,<br>
                Valentin
              </p>

              <p style="margin:4px 0 0 0; font-size:13px; color:#999;">
                <a href="https://yourclaw.dev" style="color:#999; text-decoration:none;">yourclaw.dev</a>
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

PLAIN_TEXT = """\
Hi {first_name},

We've been working hard on YourClaw over the past weeks and just shipped a big update. Here's what's new:

WhatsApp & Telegram support
YourClaw now works on both WhatsApp and Telegram. WhatsApp is fully operational - connect your number, scan a QR code, and you're set. We've also deeply improved Telegram: it's faster, more reliable, and honestly the smoothest way to chat with your assistant right now.

A built-in web browser
Your assistant now has its own browser. It can search the internet, read pages, fill out forms, and interact with websites - all on your behalf.

Reminders, code, and deployment - from chat
Set reminders with a message. Your assistant can also write code, create files, and deploy projects for you - no terminal, no IDE, just chat.

Sub-agents
You can now create smaller, specialized assistants that work alongside your main one. Give them specific tasks and let them run in parallel.

Cheaper AI models
Switch to affordable models like MiniMax, DeepSeek, or Kimi for everyday conversations. Same assistant, same tools - way cheaper to run.

Coming soon: a dashboard for all your agents
We're integrating with Tailscale so you can see every agent, chat with any of them, and watch what they're doing - all from one screen.

You can try everything with a 48-hour free trial. If it's not for you, cancel anytime - you won't be charged.

Set up YourClaw now: https://yourclaw.dev/dashboard

If you have any questions, just reply to this email - I read every one.

Talk soon,
Valentin
https://yourclaw.dev
"""


def main():
    resend.api_key = RESEND_API_KEY

    # 1. Fetch all users from production Supabase
    print("Fetching users from production Supabase...")
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        },
        params={"page": 1, "per_page": 500},
    )
    resp.raise_for_status()
    users = resp.json().get("users", [])
    print(f"Found {len(users)} users\n")

    # 2. Send to each user
    sent = 0
    failed = 0
    for user in users:
        email = user.get("email", "")
        if not email or email == "dev@localhost":
            continue

        meta = user.get("user_metadata", {}) or {}
        full_name = meta.get("full_name", "") or meta.get("name", "") or ""
        first_name = full_name.split(" ")[0] if full_name else "there"

        html = ANNOUNCEMENT_HTML.replace("{first_name}", first_name)
        text = PLAIN_TEXT.replace("{first_name}", first_name)

        try:
            resend.Emails.send({
                "from": "Valentin from YourClaw <hello@yourclaw.dev>",
                "to": [email],
                "subject": "What's new in YourClaw",
                "html": html,
                "text": text,
                "headers": {
                    "List-Unsubscribe": "<mailto:hello@yourclaw.dev?subject=unsubscribe>",
                },
            })
            print(f"  Sent to {email} ({first_name})")
            sent += 1
            time.sleep(0.2)  # rate limit safety
        except Exception as e:
            print(f"  FAILED {email}: {e}")
            failed += 1

    print(f"\nDone! Sent: {sent}, Failed: {failed}")


if __name__ == "__main__":
    main()
