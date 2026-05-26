import { NextRequest, NextResponse } from "next/server";
import { enqueueInboundEmail } from "@server/adapters/email/background";
import { resendAdapter } from "@server/adapters/email/resend";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!resendAdapter.verifyWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid webhook signature" } },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  enqueueInboundEmail(payload);

  return NextResponse.json({ accepted: true });
}
