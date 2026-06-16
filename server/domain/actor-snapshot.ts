import { createAdminClient } from "@server/lib/supabase-admin";
import type { ActivityActorSnapshot } from "@shared/activity/types";

export async function loadStaffActorSnapshot(
  userId: string,
): Promise<ActivityActorSnapshot> {
  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("username, email")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return { label: "Agent" };
  }

  const label =
    data.username && data.email
      ? `${data.username} · ${data.email}`
      : data.username || data.email || "Agent";

  return {
    label,
    username: data.username,
    email: data.email,
  };
}

export async function loadApiKeyActorSnapshot(
  apiKeyId: string,
): Promise<ActivityActorSnapshot> {
  const db = createAdminClient();
  const { data } = await db
    .from("api_keys")
    .select("name, revoked_at")
    .eq("id", apiKeyId)
    .maybeSingle();

  if (!data || data.revoked_at) {
    return { label: "Deleted API key", api_key_name: null };
  }

  return {
    label: data.name,
    api_key_name: data.name,
  };
}

export async function loadStaffActorSnapshots(
  userIds: string[],
): Promise<Map<string, { username: string; email: string }>> {
  const map = new Map<string, { username: string; email: string }>();
  if (userIds.length === 0) return map;

  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("id, username, email")
    .in("id", userIds);

  for (const row of data ?? []) {
    map.set(row.id, {
      username: row.username ?? "",
      email: row.email ?? "",
    });
  }

  return map;
}

export async function loadApiKeyActorSnapshots(
  apiKeyIds: string[],
): Promise<Map<string, { name: string; revoked_at: string | null }>> {
  const map = new Map<string, { name: string; revoked_at: string | null }>();
  if (apiKeyIds.length === 0) return map;

  const db = createAdminClient();
  const { data } = await db
    .from("api_keys")
    .select("id, name, revoked_at")
    .in("id", apiKeyIds);

  for (const row of data ?? []) {
    map.set(row.id, {
      name: row.name,
      revoked_at: row.revoked_at,
    });
  }

  return map;
}
