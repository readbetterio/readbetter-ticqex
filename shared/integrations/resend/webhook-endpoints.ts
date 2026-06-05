import type { ResendDeliveryEventType } from "@shared/integrations/resend/webhook-types";

export const RESEND_WEBHOOK_PATH = "/api/webhooks/integrations/resend";

const RESEND_DELIVERY_WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.failed",
] as const satisfies readonly ResendDeliveryEventType[];

export const RESEND_WEBHOOK_EVENTS = [
  "email.received",
  ...RESEND_DELIVERY_WEBHOOK_EVENTS,
] as const;

export function normalizeAppUrl(appUrl: string): string {
  return appUrl.trim().replace(/\/+$/, "");
}

export function isHttpsAppUrl(appUrl: string): boolean {
  try {
    return new URL(normalizeAppUrl(appUrl)).protocol === "https:";
  } catch {
    return false;
  }
}

export const RESEND_WEBHOOK_HTTPS_REQUIRED =
  "Resend webhooks require an HTTPS endpoint URL (https://). Use a tunnel or deployment hostname, not http://localhost.";

export function resendWebhookEndpoint(appUrl: string, path: string): string {
  return `${normalizeAppUrl(appUrl)}${path}`;
}

export function resendWebhookUrl(appUrl: string): string {
  return resendWebhookEndpoint(appUrl, RESEND_WEBHOOK_PATH);
}
