import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, toolName, description } = await request.json();

    if (!email || !description) {
      return NextResponse.json(
        { error: "Email and description are required" },
        { status: 400 }
      );
    }

    // Send notification email to team
    await resend.emails.send({
      from: "YourClaw <noreply@yourclaw.dev>",
      to: ["valentin@yourclaw.dev"],
      subject: `Tool Request: ${toolName || "New Tool"}`,
      html: `
        <h2>New Tool Request</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Tool Name:</strong> ${toolName || "Not specified"}</p>
        <p><strong>Description:</strong></p>
        <p>${description.replace(/\n/g, "<br>")}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tool request error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
