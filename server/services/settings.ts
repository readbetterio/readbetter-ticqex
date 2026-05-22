import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";

export async function getSettings() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("global_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
}

export async function patchSettings(patch: Record<string, unknown>) {
  const db = createAdminClient();

  if (
    patch.default_inbound_status_id !== undefined &&
    patch.default_inbound_status_id !== null
  ) {
    const { data: status, error: statusErr } = await db
      .from("status_types")
      .select("id")
      .eq("id", patch.default_inbound_status_id)
      .maybeSingle();
    if (statusErr) throw ApiError.internal(statusErr.message);
    if (!status) {
      throw ApiError.badRequest("default_inbound_status_id is not a valid status");
    }
  }

  const { data, error } = await db
    .from("global_settings")
    .update(patch)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
}
