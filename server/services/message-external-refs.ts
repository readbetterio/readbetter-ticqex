import { ApiError } from "@server/lib/errors";
import { createAdminClient } from "@server/lib/supabase-admin";

export type ExternalRefDirection = "inbound" | "outbound";

export type MessageExternalRefRow = {
  id: string;
  message_id: string;
  provider: string;
  integration_key: string;
  direction: ExternalRefDirection;
  ref_type: string;
  external_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type InsertMessageExternalRefInput = {
  messageId: string;
  provider: string;
  integrationKey: string;
  direction: ExternalRefDirection;
  refType: string;
  externalId: string;
  metadata?: Record<string, unknown>;
};

export async function insertMessageExternalRef(
  input: InsertMessageExternalRefInput,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("message_external_refs").insert({
    message_id: input.messageId,
    provider: input.provider,
    integration_key: input.integrationKey,
    direction: input.direction,
    ref_type: input.refType,
    external_id: input.externalId,
    metadata: input.metadata ?? {},
  });
  if (error) throw ApiError.internal(error.message);
}

export async function findMessageByExternalRef(params: {
  provider: string;
  integrationKey: string;
  direction: ExternalRefDirection;
  refType: string;
  externalId: string;
}): Promise<{ id: string; ticket_id: string } | null> {
  const db = createAdminClient();
  const { data: ref, error: refError } = await db
    .from("message_external_refs")
    .select("message_id")
    .eq("provider", params.provider)
    .eq("integration_key", params.integrationKey)
    .eq("direction", params.direction)
    .eq("ref_type", params.refType)
    .eq("external_id", params.externalId)
    .maybeSingle();

  if (refError) throw ApiError.internal(refError.message);
  if (!ref) return null;

  const { data: message, error: messageError } = await db
    .from("messages")
    .select("id, ticket_id")
    .eq("id", ref.message_id)
    .maybeSingle();

  if (messageError) throw ApiError.internal(messageError.message);
  return message;
}
