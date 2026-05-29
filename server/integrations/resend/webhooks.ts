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

function inboundWebhookSecret(): string | undefined {
  return process.env.RESEND_INBOUND_WEBHOOK_SECRET;
}

function eventsWebhookSecret(): string | undefined {
  return (
    process.env.RESEND_EVENTS_WEBHOOK_SECRET ??
    process.env.RESEND_INBOUND_WEBHOOK_SECRET
  );
}

export function verifyResendInboundWebhook(
  payload: string,
  headers: Headers,
): boolean {
  return verifySvixWebhook(payload, headers, inboundWebhookSecret());
}

export function verifyResendEventsWebhook(
  payload: string,
  headers: Headers,
): boolean {
  return verifySvixWebhook(payload, headers, eventsWebhookSecret());
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

export async function handleResendInboundWebhook(
  rawBody: string,
  headers: Headers,
): Promise<IntegrationWebhookResult> {
  if (!verifyResendInboundWebhook(rawBody, headers)) {
    return unauthorized();
  }

  const payload = parseResendInboundWebhookPayload(rawBody);
  if (!payload) return invalidJson();

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

export async function handleResendEventsWebhook(
  rawBody: string,
  headers: Headers,
): Promise<IntegrationWebhookResult> {
  if (!verifyResendEventsWebhook(rawBody, headers)) {
    return unauthorized();
  }

  const payload = parseResendDeliveryWebhookPayload(rawBody);
  if (!payload) return invalidJson();
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
