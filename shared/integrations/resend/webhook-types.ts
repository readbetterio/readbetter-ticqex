export type ResendWebhookEnvelope<TData> = {
  type: string;
  created_at?: string;
  data: TData;
};

export type ResendInboundEmailData = {
  email_id: string;
  from?: string;
  to?: string | string[];
  cc?: string | string[];
  cc_addresses?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  message_id?: string;
  headers?: Record<string, string | string[]>;
  attachments?: unknown;
};

/** Resend `email.received` webhook payload (metadata-only; body fetched via API). */
export type ResendInboundWebhookPayload =
  ResendWebhookEnvelope<ResendInboundEmailData>;

export type ResendDeliveryEventType =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.failed";

export type ResendDeliveryEmailData = {
  email_id: string;
};

/** Resend outbound delivery lifecycle webhook payload. */
export type ResendDeliveryWebhookPayload =
  ResendWebhookEnvelope<ResendDeliveryEmailData> & {
    type: ResendDeliveryEventType | string;
  };

export function isResendInboundWebhookPayload(
  value: unknown,
): value is ResendInboundWebhookPayload {
  if (!value || typeof value !== "object") return false;
  const envelope = value as ResendInboundWebhookPayload;
  return (
    envelope.type === "email.received" &&
    typeof envelope.data?.email_id === "string"
  );
}

export function isResendDeliveryWebhookPayload(
  value: unknown,
): value is ResendDeliveryWebhookPayload {
  if (!value || typeof value !== "object") return false;
  const envelope = value as ResendDeliveryWebhookPayload;
  return (
    typeof envelope.type === "string" &&
    typeof envelope.data?.email_id === "string"
  );
}

export function parseResendInboundWebhookPayload(
  rawBody: string,
): ResendInboundWebhookPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return isResendInboundWebhookPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseResendDeliveryWebhookPayload(
  rawBody: string,
): ResendDeliveryWebhookPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return isResendDeliveryWebhookPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
