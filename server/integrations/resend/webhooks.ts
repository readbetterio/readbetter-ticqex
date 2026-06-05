import { verifySvixWebhook } from "@server/integrations/resend/verify-svix";
import {
  normalizeResendDeliveryEvent,
  resolveResendInbound,
} from "@server/integrations/resend/email";
import {
  parseResendDeliveryWebhookPayload,
  parseResendInboundWebhookPayload,
} from "@shared/integrations/resend/webhook-types";
import type { IntegrationWebhookResult } from "@server/integrations/types";

function resendWebhookSecret(): string | undefined {
  return process.env.RESEND_WEBHOOK_SECRET;
}

export function verifyResendWebhook(
  payload: string,
  headers: Headers,
): boolean {
  return verifySvixWebhook(payload, headers, resendWebhookSecret());
}

function unauthorized(): IntegrationWebhookResult {
  return {
    status: 401,
    body: {
      error: { code: "unauthorized", message: "Invalid webhook signature" },
    },
  };
}

function invalidJson(): IntegrationWebhookResult {
  return {
    status: 400,
    body: { error: { code: "bad_request", message: "Invalid JSON" } },
  };
}

async function handleInboundPayload(
  payload: NonNullable<ReturnType<typeof parseResendInboundWebhookPayload>>,
): Promise<IntegrationWebhookResult> {
  const {
    channelUnavailableWebhookResult,
    getOperationalEmailChannel,
  } = await import("@server/config/channel-gate");

  const channel = getOperationalEmailChannel();
  if (!channel) {
    return channelUnavailableWebhookResult();
  }

  const { enqueueChannelInbound } = await import(
    "@server/channels/email/background"
  );
  enqueueChannelInbound("email", () => resolveResendInbound(payload));
  return { status: 200, body: { accepted: true } };
}

async function handleDeliveryPayload(
  payload: NonNullable<ReturnType<typeof parseResendDeliveryWebhookPayload>>,
): Promise<IntegrationWebhookResult> {
  const event = normalizeResendDeliveryEvent(payload);
  if (!event) {
    return {
      status: 200,
      body: { accepted: true, processed: false, reason: "ignored_event" },
    };
  }

  const {
    channelUnavailableWebhookResult,
    getOperationalEmailChannel,
  } = await import("@server/config/channel-gate");

  const channel = getOperationalEmailChannel();
  if (!channel) {
    return channelUnavailableWebhookResult();
  }

  const result = await channel.deliveryEvents.handle({ payload: event });
  return { status: 200, body: { accepted: true, ...result } };
}

export async function handleResendWebhook(
  rawBody: string,
  headers: Headers,
): Promise<IntegrationWebhookResult> {
  if (!verifyResendWebhook(rawBody, headers)) {
    return unauthorized();
  }

  const inboundPayload = parseResendInboundWebhookPayload(rawBody);
  if (inboundPayload) {
    return handleInboundPayload(inboundPayload);
  }

  const deliveryPayload = parseResendDeliveryWebhookPayload(rawBody);
  if (deliveryPayload) {
    return handleDeliveryPayload(deliveryPayload);
  }

  return invalidJson();
}
