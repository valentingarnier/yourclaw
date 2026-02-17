import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const INFRA_API_URL =
  process.env.YOURCLAW_INFRA_API_URL || "https://infra.api.yourclaw.dev";
const YOURCLAW_API_KEY = process.env.YOURCLAW_API_KEY;
const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const DEV_USER_ID = process.env.DEV_USER_ID;

/**
 * Compute infra user ID from Supabase UUID.
 * Must match backend/app/services/infra_api.py:infra_user_id()
 */
function infraUserId(userId: string): string {
  const hash = createHash("sha256").update(userId).digest("hex");
  const num = parseInt(hash.substring(0, 10), 16) % 10 ** 8;
  return `user-${num}`;
}

/**
 * SSE proxy: authenticates via Supabase cookies, verifies assistant ownership,
 * then streams WhatsApp QR login events from the infra API.
 *
 * Returns a ReadableStream that proxies SSE events from the infra API pod.
 * The stream stays open until the pod sends "connected" or an error occurs.
 */
export async function GET() {
  let authUserId: string;
  let authToken: string;

  if (DEV_MODE && DEV_USER_ID) {
    authUserId = DEV_USER_ID;
    authToken = "dev-token";
  } else {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ detail: "Session expired" }, { status: 401 });
    }

    authUserId = user.id;
    authToken = session.access_token;
  }

  if (!YOURCLAW_API_KEY) {
    return NextResponse.json(
      { detail: "Server misconfigured: missing API key" },
      { status: 500 }
    );
  }

  // 1. Validate assistant is READY + WHATSAPP
  let assistant;
  try {
    const assistantResp = await fetch(`${BACKEND_API_URL}/api/v1/assistants`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!assistantResp.ok) {
      return NextResponse.json(
        { detail: "Failed to get assistant info" },
        { status: 500 }
      );
    }

    assistant = await assistantResp.json();
  } catch {
    return NextResponse.json(
      { detail: "Cannot reach backend API" },
      { status: 502 }
    );
  }

  if (assistant.status !== "READY") {
    return NextResponse.json(
      { detail: "Assistant not ready" },
      { status: 400 }
    );
  }

  if (assistant.channel !== "WHATSAPP") {
    return NextResponse.json(
      { detail: "Assistant is not configured for WhatsApp" },
      { status: 400 }
    );
  }

  const clawId = assistant.claw_id;
  if (!clawId) {
    return NextResponse.json(
      { detail: "Assistant has no claw_id" },
      { status: 400 }
    );
  }

  const userId = infraUserId(authUserId);
  const sseUrl = `${INFRA_API_URL}/claws/${userId}/${clawId}/whatsapp/login`;

  // 2. Open SSE stream to infra API with timeout + error handling
  //    Use AbortController for a 200s connection timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 200_000);

  let infraResp: Response;
  try {
    infraResp = await fetch(sseUrl, {
      headers: {
        Authorization: `Bearer ${YOURCLAW_API_KEY}`,
        Accept: "text/event-stream",
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Connection to infra API timed out"
        : `Cannot reach infra API: ${err}`;
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  if (!infraResp.ok) {
    clearTimeout(timeout);
    const body = await infraResp.text().catch(() => "");
    return NextResponse.json(
      { detail: `Infra API error ${infraResp.status}: ${body}` },
      { status: 502 }
    );
  }

  const infraBody = infraResp.body;
  if (!infraBody) {
    clearTimeout(timeout);
    return NextResponse.json({ detail: "No response body from infra API" }, { status: 502 });
  }

  // 3. Proxy the SSE stream: pipe infra API ReadableStream to the browser.
  //    Use a TransformStream so the connection stays open while data flows.
  const { readable, writable } = new TransformStream();

  // Pipe in background — don't await so we return the response immediately
  (async () => {
    const reader = infraBody.getReader();
    const writer = writable.getWriter();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } catch {
      // Stream closed by client or infra API — expected
    } finally {
      clearTimeout(timeout);
      writer.close().catch(() => {});
      reader.cancel().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
