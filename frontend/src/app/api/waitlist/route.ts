import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, phone, model } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Send notification email to hello@yourclaw.dev
    await resend.emails.send({
      from: "YourClaw <waitlist@yourclaw.dev>",
      to: "hello@yourclaw.dev",
      subject: "New Waitlist Signup",
      html: `
        <h2>New waitlist signup!</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>WhatsApp:</strong> ${phone || "Not provided"}</p>
        <p><strong>Preferred model:</strong> ${model || "claude"}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    });

    // Send confirmation email to the user
    await resend.emails.send({
      from: "YourClaw <hello@yourclaw.dev>",
      to: email,
      subject: "You're on the YourClaw waitlist!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">You're on the list!</h1>
          <p>Thanks for joining the YourClaw waitlist. We're launching on <strong>February 12th, 2026</strong>.</p>
          <p>YourClaw is your personal AI assistant on WhatsApp. Research, write, analyze, and automate tasks — all through simple chat.</p>
          ${phone ? `<p>We'll send your assistant to <strong>${phone}</strong> as soon as we launch.</p>` : ""}
          <p>We'll send you an email as soon as we're live.</p>
          <p style="color: #666; margin-top: 30px;">— The YourClaw Team</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
