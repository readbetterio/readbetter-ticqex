export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export const EMAIL_PROVIDER_MESSAGE_REF_TYPE = "provider_email_id";

export type EmailProviderRefDirection = "inbound" | "outbound";

export interface EmailProviderRef {
  provider: string;
  integrationKey: string;
  direction: EmailProviderRefDirection;
  refType: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

export interface OutboundEmail {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  inReplyTo?: string;
  references?: string[];
  attachments?: EmailAttachment[];
}

export interface ParsedEmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
  sizeBytes: number;
}

export interface ParsedEmail {
  from: string;
  fromName?: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  messageId: string;
  /** Provider-scoped ref, stable across webhook retries. */
  providerRef?: EmailProviderRef;
  inReplyTo?: string;
  references?: string[];
  attachments: ParsedEmailAttachment[];
}

export type EmailDeliveryStatus = "sent" | "delivered" | "bounced" | "failed";

export interface EmailDeliveryEvent {
  status: EmailDeliveryStatus;
  providerRef: EmailProviderRef;
  providerEventType?: string;
  occurredAt?: string;
}

export interface EmailDeliveryEventResult {
  [key: string]: unknown;
  processed: boolean;
  status?: EmailDeliveryStatus;
  messageId?: string;
  reason?: "ignored_event" | "missing_provider_ref" | "message_not_found";
}
