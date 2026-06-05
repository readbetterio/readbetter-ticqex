import { NextRequest, NextResponse } from "next/server";
import { dispatchIntegrationWebhook } from "@server/integrations/webhook-dispatch";

type RouteContext = {
  params: Promise<{ integration: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { integration } = await context.params;
  const rawBody = await request.text();

  const result = await dispatchIntegrationWebhook(
    integration,
    "webhook",
    rawBody,
    request.headers,
  );

  return NextResponse.json(result.body, { status: result.status });
}
