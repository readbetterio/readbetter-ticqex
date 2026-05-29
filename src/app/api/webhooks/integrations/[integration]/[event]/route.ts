import { NextRequest, NextResponse } from "next/server";
import { dispatchIntegrationWebhook } from "@server/integrations/webhook-dispatch";

type RouteContext = {
  params: Promise<{ integration: string; event: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { integration, event } = await context.params;
  const rawBody = await request.text();

  const result = await dispatchIntegrationWebhook(
    integration,
    event,
    rawBody,
    request.headers,
  );

  return NextResponse.json(result.body, { status: result.status });
}
