/**
 * Smoke test for ticket deletion cleanup (local dev).
 * Run: tsx --env-file=.env.local scripts/test-ticket-delete.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../server/lib/supabase-admin";

const BASE =
  process.env.LOCAL_APP_URL ??
  (process.env.NEXT_PUBLIC_APP_URL?.includes("127.0.0.1") ||
  process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "http://127.0.0.1:3000");
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ticqex.local";
const password = process.env.SEED_ADMIN_PASSWORD ?? "ticqex-admin-change-me";

async function api<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { data?: T; error?: { message: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `HTTP ${res.status} ${path}`);
  }
  return json.data as T;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: auth, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !auth.session) {
    throw new Error(`Sign in failed: ${signInErr?.message ?? "no session"}`);
  }
  const token = auth.session.access_token;
  const userId = auth.user!.id;

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  if (health.checks?.database !== "ok") {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }

  const db = createAdminClient();
  let ticketId: string | null = null;
  let fieldId: string | null = null;
  let statusId: string | null = null;
  let previousLaneOrder: string[] | null = null;

  try {
    const { data: status } = await db
      .from("status_types")
      .select("id")
      .order("position")
      .limit(1)
      .single();
    if (!status) throw new Error("No status found");
    statusId = status.id as string;

    const { data: ticket, error: ticketErr } = await db
      .from("tickets")
      .insert({
        title: "Ticket delete smoke test",
        kind: "task",
        body: "This ticket should be deleted by the smoke test.",
        status_id: statusId,
        origin: "manual",
      })
      .select("id")
      .single();
    if (ticketErr || !ticket) {
      throw new Error(ticketErr?.message ?? "ticket insert failed");
    }
    ticketId = ticket.id as string;

    const fieldKey = `delete_smoke_${ticketId.replaceAll("-", "_")}`;
    const { data: field, error: fieldErr } = await db
      .from("custom_field_definitions")
      .insert({
        group: "ticket",
        key: fieldKey,
        label: "Delete smoke field",
        type: "text",
      })
      .select("id")
      .single();
    if (fieldErr || !field) {
      throw new Error(fieldErr?.message ?? "custom field insert failed");
    }
    fieldId = field.id as string;

    const { error: valueErr } = await db.from("custom_field_values").insert({
      field_id: fieldId,
      entity_type: "ticket",
      entity_id: ticketId,
      value_text: "delete me",
    });
    if (valueErr) throw new Error(valueErr.message);

    const { data: laneOrder } = await db
      .from("board_lane_orders")
      .select("ticket_ids")
      .eq("user_id", userId)
      .eq("status_id", statusId)
      .maybeSingle();
    previousLaneOrder = ((laneOrder?.ticket_ids as string[] | null) ?? []).filter(
      (id) => id !== ticketId,
    );

    const { error: laneErr } = await db.from("board_lane_orders").upsert(
      {
        user_id: userId,
        status_id: statusId,
        ticket_ids: [ticketId, ...previousLaneOrder],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,status_id" },
    );
    if (laneErr) throw new Error(laneErr.message);

    await api<{ deleted: true }>(`/api/v1/tickets/${ticketId}`, token, {
      method: "DELETE",
    });

    const { count: ticketCount } = await db
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("id", ticketId);
    if (ticketCount !== 0) {
      throw new Error(`Expected deleted ticket, count=${ticketCount}`);
    }

    const { count: valueCount } = await db
      .from("custom_field_values")
      .select("*", { count: "exact", head: true })
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId);
    if (valueCount !== 0) {
      throw new Error(`Expected deleted custom field values, count=${valueCount}`);
    }

    const { data: laneAfter } = await db
      .from("board_lane_orders")
      .select("ticket_ids")
      .eq("user_id", userId)
      .eq("status_id", statusId)
      .maybeSingle();
    const ticketIds = ((laneAfter?.ticket_ids as string[] | null) ?? []);
    if (ticketIds.includes(ticketId)) {
      throw new Error("Deleted ticket still appears in board_lane_orders");
    }

    console.log("OK ticket delete smoke test passed");
  } finally {
    if (ticketId) {
      await db.from("tickets").delete().eq("id", ticketId);
    }
    if (fieldId) {
      await db.from("custom_field_definitions").delete().eq("id", fieldId);
    }
    if (statusId && previousLaneOrder) {
      if (previousLaneOrder.length) {
        await db.from("board_lane_orders").upsert(
          {
            user_id: userId,
            status_id: statusId,
            ticket_ids: previousLaneOrder,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,status_id" },
        );
      } else {
        await db
          .from("board_lane_orders")
          .delete()
          .eq("user_id", userId)
          .eq("status_id", statusId);
      }
    }
  }
}

main().catch((err) => {
  console.error("FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
