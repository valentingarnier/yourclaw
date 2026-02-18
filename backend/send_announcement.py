"""Send announcement broadcast to all Resend audience contacts."""

import os
import resend

RESEND_API_KEY = os.environ["RESEND_API_KEY"]

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
              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.7; color:#333;">Hi there,</p>

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


def main():
    resend.api_key = RESEND_API_KEY

    # 1. List audiences
    print("Fetching audiences...")
    audiences = resend.Audiences.list()
    print(f"Raw response: {audiences}")

    # Handle both dict and object responses
    audience_list = audiences.get("data", []) if isinstance(audiences, dict) else getattr(audiences, "data", [])

    if not audience_list:
        print("ERROR: No audiences found.")
        return

    audience = audience_list[0]
    audience_id = audience.get("id") if isinstance(audience, dict) else audience.id
    audience_name = audience.get("name") if isinstance(audience, dict) else audience.name
    print(f"Audience: '{audience_name}' (ID: {audience_id})")

    # 2. Create broadcast
    print("Creating broadcast...")
    broadcast = resend.Broadcasts.create({
        "audience_id": audience_id,
        "from": "Valentin from YourClaw <hello@yourclaw.dev>",
        "subject": "What's new in YourClaw",
        "html": ANNOUNCEMENT_HTML,
        "name": "February 2026 - Major Update",
    })

    broadcast_id = broadcast.get("id") if isinstance(broadcast, dict) else broadcast.id
    print(f"Broadcast created (ID: {broadcast_id})")

    # 3. Send
    print(f"\nSending to audience '{audience_name}'...")
    result = resend.Broadcasts.send({"broadcast_id": broadcast_id})
    print(f"Broadcast sent! Result: {result}")
    print("Done — emails are being delivered.")


if __name__ == "__main__":
    main()
