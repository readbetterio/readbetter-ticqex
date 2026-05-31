import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import type {
  EmailDeliveryEvent,
  EmailDeliveryStatus,
  EmailProviderRef,
  OutboundEmail,
  ParsedEmail,
} from "@shared/channels/email/transport";
import { EMAIL_PROVIDER_MESSAGE_REF_TYPE } from "@shared/channels/email/transport";
import type {
  ResendDeliveryWebhookPayload,
  ResendInboundEmailData,
  ResendInboundWebhookPayload,
} from "@shared/integrations/resend/webhook-types";

const RESEND_PROVIDER = "resend";
const RESEND_INTEGRATION_KEY = "resend";

function resendProviderRef(
  direction: EmailProviderRef["direction"],
  externalId: string | undefined,
): EmailProviderRef | undefined {
  if (!externalId) return undefined;
  return {
    provider: RESEND_PROVIDER,
    integrationKey: RESEND_INTEGRATION_KEY,
    direction,
    refType: EMAIL_PROVIDER_MESSAGE_REF_TYPE,
    externalId,
  };
}

function extractAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

function extractDisplayName(raw: string): string | undefined {
  const match = raw.match(/^([^<]+)</);
  if (!match) return undefined;
  return match[1]!.trim().replace(/^["']|["']$/g, "");
}

function parseAddressList(raw: string | string[] | undefined | null): string[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  const addresses: string[] = [];
  for (const value of values) {
    for (const part of String(value).split(",")) {
      const addr = extractAddress(part);
      if (addr) addresses.push(addr);
    }
  }
  return [...new Set(addresses)];
}

function inboundEmailData(raw: ResendInboundWebhookPayload): ResendInboundEmailData {
  return raw.data;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function headerValue(
  headers: Record<string, string | string[]> | null | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lower) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

/** Inline base64 content (outbound / legacy). Resend inbound metadata has no `content`. */
function parseAttachments(
  rawAttachments: unknown,
): ParsedEmail["attachments"] {
  const attachments: ParsedEmail["attachments"] = [];
  for (const att of (rawAttachments ?? []) as Array<Record<string, unknown>>) {
    if (!att.content) continue;
    const content = Buffer.from(String(att.content), "base64");
    attachments.push({
      filename: String(att.filename ?? "attachment"),
      contentType: String(
        att.content_type ?? att.contentType ?? "application/octet-stream",
      ),
      content,
      sizeBytes: content.length,
    });
  }
  return attachments;
}

async function downloadResendInboundAttachments(
  emailId: string,
  resend: Resend,
): Promise<ParsedEmail["attachments"]> {
  const { data: listResult, error } =
    await resend.emails.receiving.attachments.list({ emailId });
  if (error) {
    console.error(
      "Failed to list received email attachments:",
      error.message,
      emailId,
    );
    return [];
  }

  const attachments: ParsedEmail["attachments"] = [];
  for (const att of listResult?.data ?? []) {
    if (!att.download_url) continue;

    try {
      const response = await fetch(att.download_url);
      if (!response.ok) {
        console.error(
          `Failed to download attachment ${att.filename ?? att.id}:`,
          response.status,
          emailId,
        );
        continue;
      }

      const content = Buffer.from(await response.arrayBuffer());
      attachments.push({
        filename: att.filename ?? "attachment",
        contentType: att.content_type ?? "application/octet-stream",
        sizeBytes: att.size ?? content.length,
        content,
      });
    } catch (err) {
      console.error(
        `Failed to download attachment ${att.filename ?? att.id}:`,
        err instanceof Error ? err.message : err,
        emailId,
      );
    }
  }

  return attachments;
}

function resendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function sendResendEmail(params: OutboundEmail): Promise<{
  messageId: string;
  providerRef?: EmailProviderRef;
}> {
  const resend = resendClient();
  if (!resend) throw new Error("RESEND_API_KEY not configured");

  const headers: Record<string, string> = {};
  if (params.inReplyTo) headers["In-Reply-To"] = params.inReplyTo;
  if (params.references?.length) {
    headers.References = params.references.join(" ");
  }

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: params.to,
    cc: params.cc?.length ? params.cc : undefined,
    subject: params.subject,
    text: params.body,
    html: params.html,
    headers,
    attachments: params.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
    })),
  });

  if (error) throw new Error(error.message);
  const providerExternalId = data?.id;
  const messageId = providerExternalId
    ? `<${providerExternalId}@resend.dev>`
    : `<${randomUUID()}@ticqex.local>`;
  return {
    messageId,
    providerRef: resendProviderRef("outbound", providerExternalId),
  };
}

function mapResendEventToDeliveryStatus(
  eventType: string,
): EmailDeliveryStatus | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

export function normalizeResendDeliveryEvent(
  raw: ResendDeliveryWebhookPayload,
): EmailDeliveryEvent | null {
  const status = mapResendEventToDeliveryStatus(raw.type);
  if (!status) return null;

  const providerRef = resendProviderRef("outbound", raw.data.email_id);
  if (!providerRef) return null;

  return {
    status,
    providerRef,
    providerEventType: raw.type,
    occurredAt: raw.created_at,
  };
}

export function parseResendInbound(
  raw: ResendInboundWebhookPayload,
): ParsedEmail {
  const data = inboundEmailData(raw);
  const fromRaw = String(data.from ?? "");
  const from = extractAddress(fromRaw);
  const fromName = extractDisplayName(fromRaw);
  const to = parseAddressList(data.to);
  const cc = parseAddressList(data.cc ?? data.cc_addresses);
  const subject = String(data.subject ?? "(no subject)");
  const text = String(data.text ?? "");
  const html = data.html ? String(data.html) : undefined;
  const headers = data.headers ?? {};

  const headerTo = headerValue(headers, "to");
  const headerCc = headerValue(headers, "cc");
  const resolvedTo = to.length ? to : parseAddressList(headerTo);
  const resolvedCc = cc.length ? cc : parseAddressList(headerCc);

  const messageId = String(
    data.message_id ??
      headers["message-id"] ??
      headers["Message-ID"] ??
      `<${randomUUID()}@inbound>`,
  );
  const inReplyTo = headers["in-reply-to"] ?? headers["In-Reply-To"];
  const referencesRaw = headers.references ?? headers.References;

  let references: string[] | undefined;
  if (typeof referencesRaw === "string") {
    references = referencesRaw.split(/\s+/).filter(Boolean);
  } else if (Array.isArray(referencesRaw)) {
    references = referencesRaw.flatMap((r) => r.split(/\s+/)).filter(Boolean);
  }

  return {
    from,
    fromName,
    to: resolvedTo,
    cc: resolvedCc,
    subject,
    body: text || (html ? htmlToPlainText(html) : ""),
    bodyHtml: html,
    messageId,
    providerRef: resendProviderRef("inbound", data.email_id),
    inReplyTo: typeof inReplyTo === "string" ? inReplyTo : undefined,
    references,
    attachments: parseAttachments(data.attachments),
  };
}

export async function resolveResendInbound(
  raw: ResendInboundWebhookPayload,
): Promise<ParsedEmail> {
  const parsed = parseResendInbound(raw);
  const emailId = inboundEmailData(raw).email_id;
  const resend = resendClient();
  if (!emailId || !resend) return parsed;

  const { data: received, error } = await resend.emails.receiving.get(emailId);
  if (error || !received) {
    console.error(
      "Failed to fetch received email body:",
      error?.message ?? "no data",
      emailId,
    );
    return parsed;
  }

  const body =
    received.text?.trim() ||
    (received.html ? htmlToPlainText(received.html) : "") ||
    parsed.body;

  const apiHeaders = received.headers;
  const inReplyTo =
    headerValue(apiHeaders, "in-reply-to") ?? parsed.inReplyTo;
  const referencesRaw = headerValue(apiHeaders, "references");
  let references = parsed.references;
  if (referencesRaw) {
    references = referencesRaw.split(/\s+/).filter(Boolean);
  }

  const fromRaw = received.from ?? "";
  const to = parseAddressList(received.to);
  const cc =
    parseAddressList(headerValue(apiHeaders, "cc")) ||
    parsed.cc;

  return {
    ...parsed,
    from: extractAddress(fromRaw) || parsed.from,
    fromName: extractDisplayName(fromRaw) ?? parsed.fromName,
    to: to.length ? to : parsed.to,
    cc,
    subject: received.subject || parsed.subject,
    body,
    bodyHtml: received.html ?? parsed.bodyHtml,
    messageId: received.message_id
      ? String(received.message_id)
      : parsed.messageId,
    inReplyTo,
    references,
    attachments: await downloadResendInboundAttachments(emailId, resend),
  };
}
