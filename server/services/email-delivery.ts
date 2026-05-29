import { createAdminClient } from "@server/lib/supabase-admin";
import {
  findMessageByExternalRef,
} from "@server/services/message-external-refs";
import type {
  EmailDeliveryEvent,
  EmailDeliveryEventResult,
} from "@shared/channels/email/transport";

export type { EmailDeliveryEventResult } from "@shared/channels/email/transport";

export async function handleEmailDeliveryEvent(
  event: EmailDeliveryEvent,
): Promise<EmailDeliveryEventResult> {
  const providerRef = event.providerRef;
  if (providerRef.direction !== "outbound") {
    return { processed: false, reason: "missing_provider_ref" };
  }

  const message = await findMessageByExternalRef({
    provider: providerRef.provider,
    integrationKey: providerRef.integrationKey,
    direction: providerRef.direction,
    refType: providerRef.refType,
    externalId: providerRef.externalId,
  });

  if (!message) {
    return { processed: false, reason: "message_not_found" };
  }

  const db = createAdminClient();
  const { error: updateError } = await db
    .from("messages")
    .update({ email_delivery_status: event.status })
    .eq("id", message.id);

  if (updateError) throw updateError;

  return { processed: true, status: event.status, messageId: message.id };
}
