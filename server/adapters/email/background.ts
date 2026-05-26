import { after } from "next/server";
import { resendAdapter } from "./resend";
import { sendOutboundEmailForMessage } from "./outbound";
import type { InboundWebhookPayload } from "./types";
import { processInboundEmail } from "@server/services/email-inbound";

export function enqueueInboundEmail(raw: InboundWebhookPayload) {
  after(async () => {
    try {
      const parsed = await resendAdapter.resolveInbound(raw);
      await processInboundEmail(parsed);
    } catch (error) {
      console.error("Inbound email processing failed:", error);
    }
  });
}

export function enqueueOutboundEmail(messageId: string) {
  after(async () => {
    try {
      await sendOutboundEmailForMessage(messageId);
    } catch (error) {
      console.error(`Outbound email failed for message ${messageId}:`, error);
    }
  });
}
